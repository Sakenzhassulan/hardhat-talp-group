// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./SwapContract.sol";

error MyToken__NotOwnerCalls();

contract MyToken is ERC20, ERC721Holder {
    IERC20 public s_token;
    SwapContract public s_swapContract;

    address public s_tokenOwner;
    address public s_swapContractAddress;
    uint256 public constant TOKENS_TO_SWAP = 100 * 10**18;

    constructor(address _swapContractAddress) ERC20("MyToken", "MTK") {
        s_swapContractAddress = _swapContractAddress;
        s_swapContract = SwapContract(_swapContractAddress);
        s_token = IERC20(address(this));
        s_tokenOwner = msg.sender;
        _mint(msg.sender, 100 * 10**decimals());
    }

    modifier onlyOwner() {
        if (msg.sender != s_tokenOwner) {
            revert MyToken__NotOwnerCalls();
        }
        _;
    }

    function transferTokensToSwap() public onlyOwner {
        approve(s_swapContractAddress, TOKENS_TO_SWAP);
        s_swapContract.acceptTokenInfo(address(this), s_tokenOwner, TOKENS_TO_SWAP);
    }

    function denyFromSwapping() public onlyOwner {
        s_swapContract.denyFromSwapping();
    }

    function getTokenOwner() public view returns (address) {
        return s_tokenOwner;
    }
}
