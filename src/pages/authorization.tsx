import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  contractEthWithAddress,
  contractWithAddress,
} from "@/config/contract_connection";
import fs from "fs";
import path from "path";
import { createRef, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { authStore } from "@/states/auth.state";
import { useRouter } from "next/router";
import { ethEnabled } from "./login";
export async function getServerSideProps() {
  let abi;
  let deployed_address;
  try {
    deployed_address = fs.readFileSync(
      path.join(__dirname, "../../../scm_address.bin"),
    );
    abi = require("../../scm.json");
  } catch (error) {
    console.log(error);
  }
  return {
    props: {
      abi: JSON.stringify(abi),
      deployed_address: deployed_address?.toString(),
      network: process.env.BLOCKHAIN_NETWORK,
    },
  };
}

export default function Authorization({ abi, deployed_address, network }) {
  const contract = contractWithAddress(
    JSON.parse(abi),
    deployed_address,
    network,
  );
  const nameRef = createRef<HTMLInputElement>();
  const [selectValue, setSelectValue] = useState(undefined);
  const [roles, setRoles] = useState([]);
  const { address, setAddress, setOwner } = authStore();
  const { push } = useRouter();
  const contractEther = contractEthWithAddress(abi, deployed_address, network);

  useEffect(() => {
        (async () => {
            const roles = await contract.methods.getAllRoles().call();
            setRoles(roles);
            window.ethereum.on("accountsChanged", (args) => {
                let _address = [args[0]];
                console.log(_address)
                setAddress(_address)
            })

            try {
                const register_status = await contractEther.checkRegisterStatus(address[0])
                if(register_status) {
                    Swal.fire({
                        icon:"info",
                        title:"Anda telah melakukan pendaftaran, anda akan langsung redirect ke halaman utama"
                    }).then((res) => {
                        if(res.isConfirmed) {
                            return push("/dashboard")
                        }
                    })
                }
            } catch (error) {
                console.log(error);
            }

            try {
                if (address.length !== 0 && address !== "") {
                    // console.log(address)
                    let tx = await contractEther.isOwner(address[0])
                    setOwner(true);
                    // let result = contractEther.callStatic(tx, tx.blockNumber)
                    // console.log(is_owner)
                } else {
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
                    if (accounts?.length !== 0) {
                        let _accounts = [accounts[0]]
                        setAddress(_accounts)
                    }
                }
            } catch (error) {
                console.log(error)
                if (error?.revert?.args) {
                    setOwner(false)
                }
            }
        })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return (
    <div className="flex flex-row justify-center pt-12">
      <div className="flex-col w-[90%]  lg:w-[30%] bg-white shadow-lg p-8">
        <div className="mb-3">
          <label
            htmlFor="UserNama"
            className="block text-sm font-semibold text-gray-700"
          >
            {" "}
            Nama{" "}
          </label>
          <input
            type="text"
            id="UserNama"
            placeholder="Nama"
            ref={nameRef}
            className="mt-1 w-full rounded-[10px]  shadow-sm sm:text-sm p-2.5 border border-gray-400"
          />
        </div>
        <label
          htmlFor="UserNama"
          className="block text-sm font-semibold text-gray-700"
        >
          Sebagai
        </label>
        <Select value={selectValue} onValueChange={setSelectValue}>
          <SelectTrigger className=" w-full text-gray-700 outline-none mt-1 focus:ring-none ring-blue-600 border border-gray-400 rounded-[10px] h-11 ">
            <SelectValue placeholder="Pilih Role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((e) => (
              <SelectItem key={e?.name} value={e?.name}>
                {e?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-center">
          <button
            onClick={() => {
              if (
                nameRef.current?.value?.length > 0 &&
                selectValue !== undefined
              ) {
                Swal.fire({
                  icon: "info",
                  text: `Apakah anda yakin akan daftar sebagai ${selectValue}`,
                }).then(async (res) => {
                  const name = nameRef.current?.value;
                  if (res.isConfirmed) {
                    try {
                      let _address = address;
                      if (address === null || address === "") {
                        const web3 = await ethEnabled();
                        _address = await web3.eth.getAccounts();
                        setAddress(_address);
                      }
                      const register = await contract.methods
                        .register(name, selectValue)
                        .send({
                          from: _address[0],
                          gas: "1400000",
                        });

                      console.log("register:", register);
                      //const response = await fetch("/api/register", {
                      //  method: "POST",
                      //  headers: {
                      //    "Content-Type": "application/json",
                      //  },
                      //  body: JSON.stringify({
                      //    id: _address[0],
                      //    name,
                      //    email: null,
                      //    password: null,
                      //    role: selectValue,
                      //  }),
                      //});
                      //console.log("response:", response);

                      return push("/dashboard");
                    } catch (error: any) {
                      console.log(error);
                      return Swal.fire({
                        icon: "error",
                        title: error,
                      });
                    }
                  }
                });
              }
            }}
            className="rounded-[10px] mt-4 group relative inline-block overflow-hidden border border-indigo-600 px-8 py-3 focus:outline-none focus:ring"
          >
            <span className="absolute inset-y-0 left-0 w-[2px] bg-indigo-600 transition-all group-hover:w-full group-active:bg-indigo-500"></span>

            <span className="relative text-sm font-semibold text-indigo-600 transition-colors group-hover:text-white">
              Masuk
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
