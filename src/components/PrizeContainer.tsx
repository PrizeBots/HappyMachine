import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { Prize } from '../types/prize';
import { getPrizeInfo } from '../constants/prizeMapping';
type PrizeState = {
  body: Matter.Body;
  prizeId: string;
};

const COLORS = {
  Small: '#60A5FA',
  Medium: '#34D399',
  Large: '#F472B6',
  XLarge: '#A78BFA',
};

const SIZES = {
  Small: 15,
  Medium: 25,
  Large: 30,
  XLarge: 35,
};

type PrizeContainerProps = {
  prizes: Prize[];
  onPrizeRemoved: (prizeId: string) => void;
};

export const PrizeContainer = React.forwardRef<{ removePrize: (prizeId: string) => void }, PrizeContainerProps>(
  ({ prizes, onPrizeRemoved }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine>();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const capsulesRef = useRef<Map<string, PrizeState>>(new Map());
    const lidRef = useRef<Matter.Body | null>(null);
    const mouseConstraintRef = useRef<Matter.MouseConstraint | null>(null);
    const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

    const ensureContainment = React.useCallback(() => {
      if (!engineRef.current || !containerRef.current) return;

      const container = containerRef.current;
      const bounds = {
        min: { x: 30, y: 0 },
        max: { x: container.clientWidth - 30, y: container.clientHeight - 30 }
      };

      capsulesRef.current.forEach((state) => {
        const { body } = state;
        let needsReset = false;

        if (body.position.x < bounds.min.x || body.position.x > bounds.max.x ||
            body.position.y < bounds.min.y || body.position.y > bounds.max.y) {
          needsReset = true;
        }

        if (needsReset) {
          Matter.Body.setPosition(body, {
            x: bounds.min.x + (bounds.max.x - bounds.min.x) * Math.random(),
            y: bounds.min.y + 100
          });
          Matter.Body.setVelocity(body, { x: 0, y: 0 });
        }
      });
    }, []);

    const removePrize = React.useCallback((prizeId: string) => {
      const prizeState = capsulesRef.current.get(prizeId);
      console.log('Attempting to remove prize:', prizeId, {
        exists: Boolean(prizeState),
        totalPrizes: capsulesRef.current.size
      });

      if (prizeState && engineRef.current) {
        console.log('Removing prize with animation:', prizeId);
        const { body } = prizeState;

        const originalFillStyle = body.render.fillStyle;
        const originalOpacity = body.render.opacity || 1;

        body.render.fillStyle = '#ffffff';

        const animations = [
          { delay: 100, fillStyle: originalFillStyle, opacity: 0.8 },
          { delay: 200, fillStyle: originalFillStyle, opacity: 0.4 },
          { delay: 300, fillStyle: originalFillStyle, opacity: 0.1 }
        ];

        animations.forEach(({ delay, fillStyle, opacity }) => {
          setTimeout(() => {
            if (body.render) {
              body.render.fillStyle = fillStyle;
              body.render.opacity = opacity;
            }
          }, delay);
        });

        setTimeout(() => {
          if (engineRef.current) {
            console.log('Removing prize from physics world:', prizeId);
            Matter.Composite.remove(engineRef.current.world, body);
            capsulesRef.current.delete(prizeId);
            onPrizeRemoved(prizeId);
            console.log('Prize removal complete:', prizeId);

            const remainingBodies = engineRef.current.world.bodies.length;
            console.log('Remaining bodies:', remainingBodies);

            if (remainingBodies <= 3) {
              console.log('No prizes remain, resetting container');
            }
          }
        }, 400);
      } else {
        console.warn('Prize not found for removal:', prizeId, {
          existingPrizes: Array.from(capsulesRef.current.keys())
        });
      }
    }, [onPrizeRemoved]);

    React.useImperativeHandle(ref, () => ({
      removePrize
    }), [removePrize]);

    useEffect(() => {
      if (!containerRef.current || !prizes) return;

      if (engineRef.current) {
        Matter.Engine.clear(engineRef.current);
        capsulesRef.current.clear();
        if (canvasRef.current) canvasRef.current.remove();
      }

      if (prizes.length === 0) {
        return;
      }

      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const lidHeight = 40;

      const engine = Matter.Engine.create();
      engineRef.current = engine;

      // Create canvas manually
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      container.appendChild(canvas);
      canvasRef.current = canvas;
      const context = canvas.getContext('2d');
      if (!context) return;

      const wallOptions = {
        isStatic: true,
        render: { fillStyle: 'rgba(255, 255, 255, 0.1)' },
      };

      const lid = Matter.Bodies.rectangle(width / 2, lidHeight / 2, width - 20, lidHeight, {
        ...wallOptions,
        chamfer: { radius: 10 },
      });
      lidRef.current = lid;

      const floor = Matter.Bodies.rectangle(width / 2, height - 10, width - 20, 20, wallOptions);
      const leftWall = Matter.Bodies.rectangle(20, height / 2, 20, height - 40, wallOptions);
      const rightWall = Matter.Bodies.rectangle(width - 20, height / 2, 20, height - 40, wallOptions);

      Matter.Composite.add(engine.world, [lid, floor, leftWall, rightWall]);

      const loadPromises: Promise<void>[] = [];
      prizes.forEach((prize, index) => {
        const sizeName = ['Small', 'Medium', 'Large', 'XLarge'][prize.size] as keyof typeof SIZES;
        const radius = SIZES[sizeName];
        const x = Math.random() * (width - 100) + 50;
        const y = -50 - index * 50;

        const prizeInfo = getPrizeInfo(prize.tokenAddress);
        if (prizeInfo?.image && !imageCacheRef.current.has(prize.prizeId.toString())) {
          const img = new Image();
          img.src = prizeInfo.image;
          const loadPromise = new Promise<void>((resolve) => {
            img.onload = () => {
              console.log('Image loaded for prize:', prize.prizeId, 'Src:', img.src);
              resolve();
            };
            img.onerror = () => {
              console.error('Failed to load image:', prizeInfo.image);
              resolve();
            };
          });
          imageCacheRef.current.set(prize.prizeId.toString(), img);
          loadPromises.push(loadPromise);
        }

        const capsule = Matter.Bodies.circle(x, y, radius, {
          restitution: 0.5,
          friction: 0.1,
          render: {
            fillStyle: COLORS[sizeName],
          },
          plugin: { prizeId: prize.prizeId.toString() },
        });

        capsulesRef.current.set(prize.prizeId.toString(), { body: capsule, prizeId: prize.prizeId.toString() });
        Matter.Composite.add(engine.world, capsule);
      });

      Promise.all(loadPromises).then(() => {
        const renderLoop = () => {
          if (!engineRef.current || !context) return;

          Matter.Engine.update(engineRef.current, 1000 / 60); // Update physics
          ensureContainment();

          context.clearRect(0, 0, width, height);

          // Draw walls
          engine.world.bodies.forEach((body) => {
            if (!body.isStatic) return;
            context.save();
            context.translate(body.position.x, body.position.y);
            context.rotate(body.angle);
            context.fillStyle = body.render.fillStyle || 'rgba(255, 255, 255, 0.1)';
            if (body === lidRef.current) {
              context.beginPath();
              context.moveTo(-body.bounds.max.x + body.position.x, -body.bounds.max.y + body.position.y + 10);
              context.lineTo(body.bounds.max.x - body.position.x, -body.bounds.max.y + body.position.y + 10);
              context.lineTo(body.bounds.max.x - body.position.x, body.bounds.max.y - body.position.y - 10);
              context.lineTo(-body.bounds.max.x + body.position.x, body.bounds.max.y - body.position.y - 10);
              context.closePath();
              context.fill();
            } else {
              context.fillRect(
                -body.bounds.max.x + body.position.x,
                -body.bounds.max.y + body.position.y,
                body.bounds.max.x - body.bounds.min.x,
                body.bounds.max.y - body.bounds.min.y
              );
            }
            context.restore();
          });

          // Draw prizes
          capsulesRef.current.forEach((state, prizeId) => {
            const { body } = state;
            const prize = prizes.find(p => p.prizeId.toString() === prizeId);
            if (!prize) return;

            const prizeInfo = getPrizeInfo(prize.tokenAddress);
            const sizeName = ['Small', 'Medium', 'Large', 'XLarge'][prize.size] as keyof typeof SIZES;
            const radius = SIZES[sizeName];
            const opacity = body.render.opacity || 1;

            context.save();
            context.translate(body.position.x, body.position.y);
            context.rotate(body.angle);
            context.globalAlpha = opacity;

            context.beginPath();
            context.arc(0, 0, radius, 0, Math.PI * 2);
            context.clip();

            if (prizeInfo?.image) {
              const img = imageCacheRef.current.get(prizeId);
              if (img && img.complete) {
                console.log('Drawing image for prize:', prizeId, 'Src:', img.src);
                context.drawImage(img, -radius, -radius, radius * 2, radius * 2);
                // Red square test
                // context.fillStyle = 'red';
                // context.fillRect(-radius / 2, -radius / 2, radius, radius);
                // console.log('Drawing red test square for prize:', prizeId);
              } else {
                context.fillStyle = COLORS[sizeName];
                context.fill();
              }
            } else {
              context.fillStyle = COLORS[sizeName];
              context.fill();
            }

            context.restore();

            // Glow effect
            context.save();
            context.globalAlpha = 0.7;
            context.shadowColor = COLORS[sizeName];
            context.shadowBlur = 20;
            context.beginPath();
            context.arc(body.position.x, body.position.y, radius + 2, 0, Math.PI * 2);
            context.strokeStyle = COLORS[sizeName];
            context.lineWidth = 2;
            context.stroke();
            context.restore();
          });

          requestAnimationFrame(renderLoop);
        };

        const mouse = Matter.Mouse.create(canvas);
        const mouseConstraint = Matter.MouseConstraint.create(engine, {
          mouse: mouse,
          constraint: {
            stiffness: 0.2,
            render: { visible: false }
          }
        });

        mouseConstraintRef.current = mouseConstraint;
        Matter.World.add(engine.world, mouseConstraint);

        const tooltip = document.getElementById('prize-tooltip');
        Matter.Events.on(mouseConstraint, 'mousemove', (event) => {
          const mousePosition = event.mouse.position;

          const hoveredBodies = Matter.Query.point(engine.world.bodies.filter(body => body.plugin?.prizeId), mousePosition);
          const hoveredBody = hoveredBodies[0];

          if (hoveredBody && tooltip) {
            const prizeId = hoveredBody.plugin?.prizeId;
            const prize = prizes.find(p => p.prizeId.toString() === prizeId);
            const prizeInfo = prize ? getPrizeInfo(prize.tokenAddress) : null;
            const sizeName = prize ? ['Small', 'Medium', 'Large', 'XLarge'][prize.size] : null;

            if (prize) {
              tooltip.innerHTML = `
                <div class="font-semibold mb-1">${prizeInfo ? prizeInfo.name : 'Prize'}</div>
                <div class="space-y-0.5 text-xs text-white/80">
                  <div>Token Address: ${prize.tokenAddress.slice(0, 6)}...${prize.tokenAddress.slice(-4)}</div>
                  <div>Token ID: ${prize.tokenId.toString()}</div>
                  <div>Amount: ${prize.amount.toString()}</div>
                  <div>Size: ${sizeName}</div>
                  <div>Prize ID: ${prize.prizeId.toString()}</div>
                </div>
              `;
              tooltip.style.display = 'block';
              tooltip.style.left = `${mousePosition.x + 10}px`;
              tooltip.style.top = `${mousePosition.y + 10}px`;
              return;
            }
          }

          if (tooltip) {
            tooltip.style.display = 'none';
          }
        });

        Matter.Runner.run(engine); // Physics only
        requestAnimationFrame(renderLoop); // Custom rendering
      });

      return () => {
        Matter.Runner.stop(engine);
        Matter.Events.off(engine, 'afterUpdate');
        if (mouseConstraintRef.current) {
          Matter.Composite.remove(engine.world, mouseConstraintRef.current);
          mouseConstraintRef.current = null;
        }
        Matter.Engine.clear(engine);
        capsulesRef.current.clear();
        imageCacheRef.current.clear();
        if (canvasRef.current) canvasRef.current.remove();
      };
    }, [prizes, ensureContainment]);

    return (
      <div className="relative w-full h-full">
        <div ref={containerRef} className="w-full h-full" />
        <div className="absolute inset-x-0 top-0 h-10 pointer-events-none bg-gradient-to-b from-black/20 to-transparent" />
        {prizes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/60 text-lg">No prizes available</p>
          </div>
        )}
        <div
          id="prize-tooltip"
          className="fixed hidden bg-black/80 text-white text-sm px-3 py-2 rounded-lg pointer-events-none z-50 backdrop-blur-sm border border-white/20"
        />
      </div>
    );
  }
);

PrizeContainer.displayName = 'PrizeContainer';