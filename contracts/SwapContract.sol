// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

//errors
error SwapContract__NotAssetOwners();
error SwapContract__UpkeepNotNeeded();

contract SwapContract is ERC721Holder, KeeperCompatibleInterface {
    //state variables
    IERC20 private s_token;
    IERC721 private s_nft;
    address private s_tokenOwner;
    address private s_tokenAddress;
    address private s_nftOwner;
    address private s_nftAddress;
    uint256 private s_swapNftBalance;
    uint256 private s_swapTokenBalance;
    uint256 private s_TOKENS_TO_SWAP;
    uint256 private s_tokenId;
    uint256 private s_lastTimeStamp;
    uint256 private constant INTERVAL = 300;

    //events
    event TokenTransfers(address indexed from, address indexed to, uint256 value);
    event NftTransfers(address indexed from, address indexed to, uint256 value);

    //modifiers
    modifier onlyAssetOwners() {
        if (!(msg.sender != s_nftAddress || msg.sender != s_tokenAddress)) {
            revert SwapContract__NotAssetOwners();
        }
        _;
    }

    //functions
    function acceptTokenInfo(
        address _tokenAddress,
        address _tokenOwner,
        uint256 _TOKENS_TO_SWAP
    ) external {
        s_tokenAddress = _tokenAddress;
        s_token = IERC20(_tokenAddress);
        s_tokenOwner = _tokenOwner;
        s_TOKENS_TO_SWAP = _TOKENS_TO_SWAP;
        transferTokensToSwapContract();
    }

    // 1.получаем информацию о токене и владельце

    function acceptNftInfo(
        address _nftAddress,
        address _nftOwner,
        uint256 _tokenId
    ) external {
        s_nftAddress = _nftAddress;
        s_nft = IERC721(_nftAddress);
        s_nftOwner = _nftOwner;
        s_tokenId = _tokenId;
        transferNftToSwapContract();
    }

    // 1.получаем информацию о NFT и владельце

    function transferTokensToSwapContract() private onlyAssetOwners {
        if (s_lastTimeStamp == 0) {
            s_lastTimeStamp = block.timestamp;
        }
        s_token.transferFrom(s_tokenOwner, address(this), s_TOKENS_TO_SWAP);
        s_swapTokenBalance = s_token.balanceOf(address(this));
        emit TokenTransfers(s_tokenOwner, address(this), s_TOKENS_TO_SWAP);
    }

    // 2.Переводим токены на этот контракт.

    function transferNftToSwapContract() private onlyAssetOwners {
        if (s_lastTimeStamp == 0) {
            s_lastTimeStamp = block.timestamp;
        }
        s_nft.safeTransferFrom(s_nftOwner, address(this), s_tokenId);
        s_swapNftBalance = s_nft.balanceOf(address(this));
        emit NftTransfers(s_nftOwner, address(this), s_tokenId);
    }

    // 2.Переводим NFT на этот контракт.

    function swapAssets() private {
        s_nft.approve(s_tokenOwner, s_tokenId);
        s_nft.safeTransferFrom(address(this), s_tokenOwner, s_tokenId);
        s_token.transfer(s_nftOwner, s_TOKENS_TO_SWAP);
        s_lastTimeStamp = 0;
        s_swapTokenBalance = 0;
        s_swapNftBalance = 0;
    }

    // Если оба стороны отправили цифровые активы, делаем обмен

    function denyFromSwapping() external onlyAssetOwners {
        cancelSwapping();
    }

    // Если одна из сторон откажется от обмена, отменяем сделку.
    // Вернем активы обоим сторонам

    function cancelSwapping() private {
        if (s_nftOwner != address(0)) {
            s_nft.approve(s_nftOwner, s_tokenId);
            s_nft.safeTransferFrom(address(this), s_nftOwner, s_tokenId);
        }
        if (s_tokenOwner != address(0)) {
            s_token.transfer(s_tokenOwner, s_TOKENS_TO_SWAP);
        }
        s_lastTimeStamp = 0;
        s_swapTokenBalance = 0;
        s_swapNftBalance = 0;
    }

    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool hasTokenBalance = (s_swapTokenBalance > 0);
        bool hasNftBalance = (s_swapNftBalance > 0);
        bool timerCheck = (block.timestamp - s_lastTimeStamp < INTERVAL);
        bool timeNotPassed = (hasTokenBalance && hasNftBalance && timerCheck);
        bool timePassed = ((hasTokenBalance || hasNftBalance) && !timerCheck);
        if (timeNotPassed) {
            // если оба активы поступили в контракт и еще время не прошло, делаем обмен
            upkeepNeeded = true;
        } else if (timePassed) {
            // если в контракте только один актив и время данное на обмен прошло, отменяем сделку
            upkeepNeeded = true;
        }
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert SwapContract__UpkeepNotNeeded();
        }
        if ((block.timestamp - s_lastTimeStamp) > INTERVAL) {
            cancelSwapping();
        } else {
            swapAssets();
        }
    }

    function getNftBalanceInSwapContract() public view returns (uint256) {
        return s_swapNftBalance;
    }

    function getTokenBalanceInSwapContract() public view returns (uint256) {
        return s_swapTokenBalance;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getInterval() public pure returns (uint256) {
        return INTERVAL;
    }
}
