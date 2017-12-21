const CNS = artifacts.require('./ContractNameService.sol')

module.exports = function(deployer, network, accounts) {
  deployer.deploy(CNS)
}
