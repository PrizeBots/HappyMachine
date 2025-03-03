// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PrizeVault is Ownable, IERC721Receiver {
    enum PrizeSize {
        Small,
        Medium,
        Large,
        XLarge
    }

    struct Prize {
        address tokenAddress;
        uint256 tokenId;
        uint256 amount;
        PrizeSize size;
        uint256 prizeId;
    }

    ERC20Burnable public gameToken;
    mapping(uint256 => Prize) public prizes;
    uint256 public prizeCount = 0;

    event PrizeDeposited(
        address tokenAddress,
        uint256 tokenId,
        uint256 amount,
        PrizeSize size,
        uint256 prizeId
    );
    event PrizeAwarded(
        address indexed winner,
        address tokenAddress,
        uint256 tokenId,
        uint256 amount,
        PrizeSize size,
        uint256 prizeId
    );
    event PrizeRedeemedByOwner(
        address indexed owner,
        address tokenAddress,
        uint256 tokenId,
        uint256 amount,
        PrizeSize size,
        uint256 prizeId
    );

    constructor(address _gameTokenAddress) Ownable(msg.sender) {
        gameToken = ERC20Burnable(_gameTokenAddress);
    }

    function depositERC20Prize(
        address tokenAddress,
        uint256 amountPerPrize,
        uint256 quantity,
        PrizeSize size
    ) external onlyOwner {
        require(
            amountPerPrize > 0 && quantity > 0,
            "Invalid prize amount or quantity"
        );
        IERC20(tokenAddress).transferFrom(
            msg.sender,
            address(this),
            amountPerPrize * quantity
        );

        for (uint256 i = 0; i < quantity; i++) {
            uint256 prizeId = uint256(
                keccak256(
                    abi.encodePacked(block.timestamp, msg.sender, prizeCount, i)
                )
            );
            prizes[prizeCount] = Prize(
                tokenAddress,
                0,
                amountPerPrize,
                size,
                prizeId
            );
            emit PrizeDeposited(tokenAddress, 0, amountPerPrize, size, prizeId);
            prizeCount++;
        }
    }

    function depositNFTPrizes(
        address tokenAddress,
        uint256[] memory tokenIds,
        PrizeSize size
    ) external onlyOwner {
        require(tokenIds.length > 0, "Must provide at least one token ID");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            IERC721(tokenAddress).safeTransferFrom(
                msg.sender,
                address(this),
                tokenIds[i]
            );
            uint256 prizeId = uint256(
                keccak256(
                    abi.encodePacked(block.timestamp, msg.sender, prizeCount, i)
                )
            );
            prizes[prizeCount] = Prize(
                tokenAddress,
                tokenIds[i],
                0,
                size,
                prizeId
            );
            emit PrizeDeposited(tokenAddress, tokenIds[i], 0, size, prizeId);
            prizeCount++;
        }
    }

    function redeemPrize(uint256 amount) external {
        require(amount > 0, "Must redeem at least 1 game token");
        require(prizeCount >= amount, "Not enough prizes available");

        // Ensure user has approved the contract before spending
        require(
            gameToken.allowance(msg.sender, address(this)) >= amount,
            "Token allowance too low"
        );

        // Transfer and burn game tokens - use burnFrom instead of burn
        gameToken.burnFrom(msg.sender, amount);

        for (uint256 i = 0; i < amount; i++) {
            uint256 prizeId = _getRandomPrizeId(i);
            Prize memory prize = prizes[prizeId];

            // Ensure the prize is valid
            require(prize.tokenAddress != address(0), "Invalid prize selected");

            // Transfer prize to user
            if (prize.amount > 0) {
                IERC20(prize.tokenAddress).transfer(msg.sender, prize.amount);
            } else {
                IERC721(prize.tokenAddress).safeTransferFrom(
                    address(this),
                    msg.sender,
                    prize.tokenId
                );
            }

            // Swap last prize into deleted slot & remove last prize
            if (prizeCount > 1) {
                prizes[prizeId] = prizes[prizeCount - 1];
            }
            delete prizes[prizeCount - 1];
            prizeCount--;

            emit PrizeAwarded(
                msg.sender,
                prize.tokenAddress,
                prize.tokenId,
                prize.amount,
                prize.size,
                prize.prizeId
            );
        }
    }

    function ownerRedeemPrize(uint256 amount) external onlyOwner {
        require(amount > 0, "Must redeem at least 1 prize");
        require(prizeCount >= amount, "Not enough prizes available");

        for (uint256 i = 0; i < amount; i++) {
            uint256 prizeId = _getRandomPrizeId(i);
            Prize memory prize = prizes[prizeId];

            require(prize.tokenAddress != address(0), "Invalid prize selected");

            if (prize.amount > 0) {
                IERC20(prize.tokenAddress).transfer(msg.sender, prize.amount);
            } else {
                IERC721(prize.tokenAddress).safeTransferFrom(
                    address(this),
                    msg.sender,
                    prize.tokenId
                );
            }

            if (prizeCount > 1) {
                prizes[prizeId] = prizes[prizeCount - 1];
            }
            delete prizes[prizeCount - 1];
            prizeCount--;

            emit PrizeRedeemedByOwner(
                msg.sender,
                prize.tokenAddress,
                prize.tokenId,
                prize.amount,
                prize.size,
                prize.prizeId
            );
        }
    }

    function _getRandomPrizeId(uint256 salt) internal view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.timestamp,
                        msg.sender,
                        block.prevrandao,
                        salt
                    )
                )
            ) % prizeCount;
    }

    function getPrizeCount() external view returns (uint256) {
        return prizeCount;
    }

    function getAllPrizes() external view returns (Prize[] memory) {
        Prize[] memory activePrizes = new Prize[](prizeCount);
        for (uint256 i = 0; i < prizeCount; i++) {
            activePrizes[i] = prizes[i];
        }
        return activePrizes;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
