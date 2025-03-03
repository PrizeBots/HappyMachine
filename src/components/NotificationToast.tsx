import React from 'react';
import { Trophy } from 'lucide-react';
import { COLORS } from '../constants/contracts';
import { Notification } from '../types/prize';

type NotificationToastProps = {
  notification: Notification;
};

export function NotificationToast({ notification }: NotificationToastProps) {
  const { id, message, size } = notification;
  const sizeName = ['Common', 'Uncommon', 'Rare', 'Ultra Rare'][size] as keyof typeof COLORS;

  return (
    <div
      className="bg-white/10 backdrop-blur-xl rounded-lg p-4 shadow-xl border border-white/20 transform transition-all duration-500 animate-slide-in"
      style={{
        backgroundColor: `${COLORS[sizeName]}20`
      }}
    >
      <div className="flex items-start gap-3">
        <Trophy className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
        <div className="text-white">
          {message.split('\n').map((line, i) => (
            <p key={i} className={i === 0 ? 'font-semibold' : 'text-white/80 text-sm'}>
              {line.trim()}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}