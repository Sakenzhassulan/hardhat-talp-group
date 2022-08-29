require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL
const SWAP_CONTRACT_OWNER_PRIVATE_KEY = process.env.SWAP_CONTRACT_OWNER_PRIVATE_KEY
const TOKEN_OWNER_PRIVATE_KEY = process.env.TOKEN_OWNER_PRIVATE_KEY
const NFT_OWNER_PRIVATE_KEY = process.env.NFT_OWNER_PRIVATE_KEY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

module.exports = {
    defaultNetwork: "hardhat",
    solidity: "0.8.4",
    networks: {
        hardhat: {
            chainId: 31337,
        },
        rinkeby: {
            url: RINKEBY_RPC_URL,
            accounts: [SWAP_CONTRACT_OWNER_PRIVATE_KEY],
            blockConfirmations: 6,
            chainId: 4,
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    gasReporter: {
        enabled: true,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true,
        // coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    },
    namedAccounts: {
        deployer: {
            default: 0,
            1: 0,
        },
    },
    mocha: {
        timeout: 200000, // 200 seconds max for running tests
    },
}
