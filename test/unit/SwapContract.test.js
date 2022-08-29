const { assert, expect } = require("chai")
const { ethers, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
// тест в локальной сети
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("SwapContract unit tests", () => {
          // describe no need to be async
          let swapContractDeployer,
              myTokenOwner,
              myNftOwner,
              SwapContract,
              MyToken,
              MyNFT,
              swapContract,
              myToken,
              myNFT,
              interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              ;[swapContractDeployer, myTokenOwner, myNftOwner] = await ethers.getSigners()
              SwapContract = await ethers.getContractFactory("SwapContract")
              MyToken = await ethers.getContractFactory("MyToken")
              MyNFT = await ethers.getContractFactory("MyNFT")
              swapContract = await SwapContract.deploy()
              myToken = await MyToken.connect(myTokenOwner).deploy(swapContract.address)
              myNFT = await MyNFT.connect(myNftOwner).deploy(swapContract.address)
              interval = await swapContract.getInterval()
          })
          // Заливаем контракты, из разных аккаунтов

          describe("acceptTokenInfo and transferTokensToSwapContract", () => {
              it("reverts when NOT token owner calls", async () => {
                  await expect(
                      myToken.connect(myNftOwner).transferTokensToSwap()
                  ).to.be.revertedWith("MyToken__NotOwnerCalls")
              })
              // Только владельцы токенов могут обменять
              it("transfers tokens to Contract, swapContractTokenBalance is not empty, lastTimeStamp changed", async () => {
                  await myToken.connect(myTokenOwner).transferTokensToSwap()
                  const swapTokenBalance = await swapContract.getTokenBalanceInSwapContract()
                  const lastTimeStamp = await swapContract.getLastTimeStamp()
                  assert(swapTokenBalance.toString(), myToken.TOKENS_TO_SWAP)
                  assert(lastTimeStamp.toNumber() > 0)
              })
              // Токены успешно отправились в Swap контракт
              it("emits event on transfer", async () => {
                  await expect(myToken.connect(myTokenOwner).transferTokensToSwap()).to.emit(
                      swapContract,
                      "TokenTransfers"
                  )
              })
              // проверка ивента
          })

          describe("denyFromSwapping", () => {
              it("token Owner denies from swapping", async () => {
                  await myToken.connect(myTokenOwner).transferTokensToSwap()
                  await myToken.connect(myTokenOwner).denyFromSwapping()
                  const balanceOfMyToken = await myToken
                      .connect(myTokenOwner)
                      .balanceOf(myTokenOwner.address)
                  assert(myToken.TOKENS_TO_SWAP, balanceOfMyToken.toString())
              })
              it("nft Owner denies from swapping", async () => {
                  await myNFT.connect(myNftOwner).transferNftToSwap()
                  await myNFT.connect(myNftOwner).denyFromSwapping()
                  const balanceOfMyNft = await myNFT
                      .connect(myNftOwner)
                      .balanceOf(myNftOwner.address)
                  assert(myToken.TOKENS_TO_SWAP, balanceOfMyNft.toString())
              })
              // если одна сторона отказывается от сделки, вернем активы их владельцам
          })

          describe("acceptNftInfo and transferNftToSwapContract", () => {
              it("reverts when NOT nft owner calls", async () => {
                  await expect(myNFT.connect(myTokenOwner).transferNftToSwap()).to.be.revertedWith(
                      "MyNFT__NotOwnerCalls"
                  )
              })
              it("transfers nft to Contract, swapContractNftBalance is not empty, lastTimeStamp changed", async () => {
                  await myNFT.connect(myNftOwner).transferNftToSwap()
                  const swapToNftBalance = await swapContract.getNftBalanceInSwapContract()
                  const lastTimeStamp = await swapContract.getLastTimeStamp()
                  assert(swapToNftBalance.toString(), "1")
                  assert(lastTimeStamp.toNumber() > 0)
              })
              it("emits event on transfer", async () => {
                  await expect(myNFT.connect(myNftOwner).transferNftToSwap()).to.emit(
                      swapContract,
                      "NftTransfers"
                  )
              })
          })

          describe("checkUpkeep", () => {
              it("returns true, if one side haven't sent any asset but time passed", async () => {
                  await myToken.connect(myTokenOwner).transferTokensToSwap()
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 10])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await swapContract.callStatic.checkUpkeep([])
                  assert(upkeepNeeded)
              })
              // В случае, когда одна сторона не отправила активы за данное время, сделка отменяется
              it("returns true, if both sides sent assets and time hasn't passed yet", async () => {
                  await myToken.connect(myTokenOwner).transferTokensToSwap()
                  await myNFT.connect(myNftOwner).transferNftToSwap()
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 10])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await swapContract.callStatic.checkUpkeep([])
                  assert(upkeepNeeded)
              })
              // Когда оба стороны отправили активы за данное время, происходит обмен
              it("returns false, if only one side sent assets and time hasn't passed", async () => {
                  await myNFT.connect(myNftOwner).transferNftToSwap()
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 10])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await swapContract.callStatic.checkUpkeep([])
                  assert.equal(upkeepNeeded, false)
              })
          })

          describe("performUpkeep", () => {
              it("it can only run if checkUpkeep is true", async () => {
                  await myToken.connect(myTokenOwner).transferTokensToSwap()
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 10])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await swapContract.callStatic.checkUpkeep([])
                  const tx = await swapContract.performUpkeep([])
                  assert(tx)
              })
              // performUpkeep выполняется когда checkUpkeep равно истине
              it("reverts when checkUpkeep is false", async () => {
                  await expect(swapContract.performUpkeep([])).to.be.revertedWith(" ")
              })
              // Ошибка при вызове performUpkeep когда checkUpkeep равно ложь
              it("swaps assets if checkUpkepp is true", async () => {
                  await myToken.connect(myTokenOwner).transferTokensToSwap()
                  await myNFT.connect(myNftOwner).transferNftToSwap()
                  await swapContract.provider.send("evm_increaseTime", [interval.toNumber() - 10])
                  await network.provider.send("evm_mine", [])
                  const txResponse = await swapContract.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  const balanceOfMyNFTInTokens = await myToken
                      .connect(myTokenOwner)
                      .balanceOf(myNftOwner.address)
                  const balanceOfMyTokenInNFT = await myNFT
                      .connect(myNftOwner)
                      .balanceOf(myTokenOwner.address)
                  assert(balanceOfMyNFTInTokens > 0)
                  assert(balanceOfMyTokenInNFT > 0)
              })
              //Оба стороны отправили активы за данное время, происходит обмен
          })
      })
