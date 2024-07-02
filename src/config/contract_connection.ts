import Web3 from "web3";
import { JsonRpcProvider, Contract } from "ethers";
export function contract(fs: any, path: any) {
    const web3 = new Web3(new Web3.providers.HttpProvider(process.env.BLOCKHAIN_NETWORK))
    const abi = require("../../scm.json");
    const deployed_address_path = path.resolve(__dirname, "../../../scm_address.bin")
    const deployed_address = fs.readFileSync(deployed_address_path, 'utf-8');

    let contract = new web3.eth.Contract(abi, deployed_address);
    return contract
}

export function contractWithAddress(abi: any, deployed_address: any, network) {
    const web3 = new Web3(new Web3.providers.HttpProvider(network))
    let contract = new web3.eth.Contract(abi, deployed_address);
    return contract
}

export function contractEthWithAddress(abi, deployed_addres, network) {
    let provider = new JsonRpcProvider(network)
    const contract = new Contract(deployed_addres, abi, provider);
    return contract;
}
