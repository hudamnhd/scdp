import Link from "next/link";
import fs from "fs";
import path from "path";
import Swal from "sweetalert2";
import { Web3 } from "web3";
import { authStore } from "@/states/auth.state";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { contractWithAddress } from "@/config/contract_connection";

export function getServerSideProps() {
  let abi;
  let deployed_address;
  try {
    deployed_address = fs.readFileSync(
      path.join(__dirname, "../../../scm_address.bin")
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

export async function ethEnabled() {
  if (window?.web3) {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    window.web3 = new Web3(window.ethereum);
    return window.web3;
  }
  return false;
}

export default function Login({ abi, deployed_address, network }) {
  const { address, setAddress } = authStore();
  const { push } = useRouter();
  useEffect(() => {
    // console.log(address);
    (async () => {
      window.ethereum.on("accountsChanged", (args) => {
        let _address = [args[0]];
        console.log(_address);
        setAddress(_address);
      });
      if (!window?.web3?.eth && address === "") {
        await ethEnabled();
        window?.web3?.eth?.getAccounts().then(async (accounts) => {
          setAddress(accounts);

          // const is_register = await contract.methods.checkLoginStatus(accounts)
        });
      }
      if (address.length !== 0 && address[0] !== null) {
        const contract = await contractWithAddress(
          JSON.parse(abi),
          deployed_address,
          network
        );

        let register_status = await contract?.methods
          ?.checkRegisterStatus(address[0])
          .call();
        let login_status = await contract.methods
          .checkLoginStatus(address[0])
          .call();

        if (!register_status) {
          return Swal.fire({
            icon: "error",
            title:
              "Anda belum terdaftar dalam jaringan blockchain, silahkan melakukan pendaftaran",
            confirmButtonText: "Daftar",
            showCancelButton: true,
          }).then((res) => {
            if (res.isConfirmed) {
              return push("/authorization");
            }
          });
        }
        if (!login_status) {
          await contract.methods
            .login()
            .send({
              from: address[0],
              gas: "850000",
            })
            .catch((err) => {
              console.log(err);
            });
          // login_status =  await contract.methods.checkLoginStatus(address[0]).call();
          // if(!login_status) return Swal.fire({
          //     icon:"info",
          //     showDenyButton: true,
          //     title:"Akun anda belum terdaftar di dalam jaringan blockchain, silahkan melakukan pendaftaran"
          // }).then((res) => {
          //     if(res.isConfirmed) {
          //         push("/authorization")
          //     }
          // })
          push("/dashboard");
        } else {
          push("/dashboard");
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return (
    <div suppressHydrationWarning={true}>
      <div className="flex flex-row justify-center pt-24">
        <div className="text-center card  shadow-lg p-8 bg-white">
          <div className="flex flex-row justify-center pt-4">
            {address === null ? (
              <button
                onClick={() => {
                  ethEnabled();
                  if (address !== "" && !window.web3) {
                    window?.web3?.eth?.getAccounts().then((accounts) => {
                      setAddress(accounts);
                    });
                  }
                }}
              >
                Hubungkan Wallet anda
              </button>
            ) : (
              <div
                role="alert"
                className="rounded-xl bg-white p-4"
              >
                <div className="flex items-center gap-4">
                  <span className="text-green-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>

                  <div className="flex-1">
                    <p className="text-start mt-1 text-sm text-gray-700">
                      Wallet Sudah Terhubung Silahkan,
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    href="/authorization"
                    className="mx-auto inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                  >
                    <span className="text-sm"> Daftar </span>

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
