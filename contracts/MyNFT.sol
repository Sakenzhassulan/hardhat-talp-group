// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./SwapContract.sol";

error MyNFT__NotOwnerCalls();

contract MyNFT is ERC721 {
    SwapContract private s_swapContract;
    IERC721 public s_nft;

    address public s_nftOwner;
    uint256 public tokenId;
    address public s_swapContractAddress;

    constructor(address _swapContractAddress) ERC721("MyNFT", "MNFT") {
        s_swapContractAddress = _swapContractAddress;
        s_swapContract = SwapContract(_swapContractAddress);
        s_nft = IERC721(address(this));
        s_nftOwner = msg.sender;
        _safeMint(msg.sender, tokenId);
    }

    modifier onlyOwner() {
        if (msg.sender != s_nftOwner) {
            revert MyNFT__NotOwnerCalls();
        }
        _;
    }

    function transferNftToSwap() public onlyOwner {
        approve(s_swapContractAddress, tokenId);
        s_swapContract.acceptNftInfo(address(this), s_nftOwner, tokenId);
    }

    function denyFromSwapping() public onlyOwner {
        s_swapContract.denyFromSwapping();
    }

    function getNftOwner() public view returns (address) {
        return s_nftOwner;
    }
}
