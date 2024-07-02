import path from "path";
import { Navbar } from "@/components/custom/navbar";
import {
  getRoleColor,
  getStatusColor,
  camelToTitleCase,
  addUnitIfKuantitas,
  initialState,
  groups,
} from "@/lib/helper";
import { format } from "date-fns";
import fs from "fs";
import {
  contractEthWithAddress,
  contractWithAddress,
} from "@/config/contract_connection";
import React, { useEffect, useState } from "react";
import { Card } from "flowbite-react";
import { fromUnixTime } from "date-fns";
import { useRouter } from "next/router";
import { authStore } from "@/states/auth.state";
import { parseJSON } from "date-fns/fp";

export async function getServerSideProps() {
  let abi;
  let deployed_address;
  try {
    const scmAddressPath = path.resolve(process.cwd(), "scm_address.bin");
    const abiPath = path.resolve(process.cwd(), "scm.json");

    // Membaca file
    deployed_address = fs.readFileSync(scmAddressPath, "utf-8");
    abi = JSON.parse(fs.readFileSync(abiPath, "utf-8"));
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

export default function History({ abi, deployed_address, network }: any) {
  const contractEth = contractEthWithAddress(
    JSON.parse(abi),
    deployed_address,
    network,
  );
  const contract = contractWithAddress(
    JSON.parse(abi),
    deployed_address,
    network,
  );

  const { push } = useRouter();
  const { address } = authStore();
  const [histories, setHistory] = useState([]);
  const [profile, setProfile] = useState<any>({});
  console.warn("DEBUGPRINT[3]: history.tsx:115: profile=", profile);
  const [komoditas, setKomoditas] = useState("");

  useEffect(() => {
    (async () => {
      if (!address[0]) return;
      const login_status = await contract.methods
        .checkLoginStatus(address[0])
        .call();
      if (!login_status) return push("/login");
      const profile: any = await contract.methods
        .profileInformation(address[0])
        .call();
      try {
        let owner = await ethContract.isOwner(address[0]);
        // alert("ANDA SEBAGAI NELAYAN", profile[2]);
        // console.log(profile);
        // setOwner(owner);
      } catch (error) {
        // setOwner(false);
        console.log(error);
      }
      setProfile({
        name: profile["3"],
        role: profile["2"],
        wallet_address: profile["0"],
      });

      const events = await contractEth.filters.productTransaction();
      const filtered = await contractEth.queryFilter(events);
      let _histories = filtered.map(async (e: any) => {
        const _json = e.args[3];
        const validJsonString = _json.replace(/'/g, '"');
        const parsed = JSON.parse(validJsonString);
        console.log("parsed:", parsed);
        // e.args[5] = fromUnixTime(BigInt(e.args[5]).toString());
        let _date = fromUnixTime(BigInt(e.args[6]).toString()).toString();

        const getSender = await contract.methods
          .profileInformation(e.args[0])
          .call();
        const getReceiver = await contract.methods
          .profileInformation(e.args[1])
          .call();

        let obj = {
          from: getSender.name,
          role_sender: getSender.role.toLowerCase(),
          to: getReceiver.name,
          role_receiver: getReceiver.role.toLowerCase(),
          product_id: e.args[2],
          // metadata: cleanedStr,
          metadata: parsed,
          status: e.args[4].toLowerCase(),
          note: e.args[5],
          timestamp: _date,
        };
        return obj;
      });

      const res = await Promise.all(_histories);

      let combinedObjects = {};

      res.forEach((item) => {
        console.warn("DEBUGPRINT[6]: history.tsx:204: item=", item);
        const productId = item.product_id;
        const metadata = item.metadata;
        const role_sender = item.role_sender;
        const role_receiver = item.role_receiver;
        const from = item.from;
        const to = item.to;
        const status = item.status;
        const time = item.timestamp;
        const note = item.note;

        if (!combinedObjects[productId]) {
          combinedObjects[productId] = {
            product_id: productId,
            metadata,
            status: [
              {
                from,
                to,
                status,
                time,
                note,
                role_sender,
                role_receiver,
                metadata,
              },
            ],
          };
        } else {
          combinedObjects[productId].status.push({
            from,
            to,
            status,
            time,
            note,
            role_sender,
            role_receiver,
          });
          combinedObjects[productId].metadata = metadata;
        }
      });
      const combinedArray = Object.values(combinedObjects);
      console.warn(
        "DEBUGPRINT[4]: history.tsx:245: combinedArray=",
        combinedArray,
      );
      setHistory(combinedArray);
    })();
  }, [address]);

  return (
    <>
      {/*NAVBAR*/}
      <Navbar />
      <div className="container mx-auto flex flex-col my-4 space-y-4">
        <span className="text-xl mb-5 font-semibold text-gray-800">
          History Transaksi Komoditas {komoditas}
        </span>
        {histories ? (
          histories.map((e: any, index: number) => {
            console.warn("DEBUGPRINT[1]: history.tsx:186: e=", e);
            const sortedData = e.status?.sort((a: any, b: any) => {
              if (a.role_receiver > b.role_receiver) {
                return 1;
              } else if (a.role_receiver < b.role_receiver) {
                return -1;
              }
            });

            return (
              <div
                key={index}
                className="flow-root rounded-lg border border-gray-300 p-3 shadow-xl"
              >
                <dl className="-my-3 text-sm">
                  <details
                    className=" divide-y divide-gray-200  grid grid-cols-1 gap-1 mt-3 sm:gap-4 items-center group [&_summary::-webkit-details-marker]:hidden"
                    open
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-1.5 rounded-lg bg-slate-50 p-4 text-gray-900 border border-gray-300 outline-none">
                      <h3 className="flex items-center text-base capitalize font-semibold text-gray-700 dark:text-white">
                        Data Produk :{" "}
                        <span className="font-medium ml-1">
                          {" "}
                          {e?.metadata?.jenisKopi
                            ? "Kopi " + e?.metadata?.jenisKopi
                            : e.productId}
                        </span>
                      </h3>

                      <svg
                        className="size-5 shrink-0 transition duration-300 group-open:-rotate-180"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </summary>

                    {Object.keys(groups).map((groupName, groupIndex) => (
                      <React.Fragment key={groupIndex}>
                        {groupName === "PETANI" &&
                          groups[groupName].map((prop, propIndex) => (
                            <div
                              key={propIndex + groupName}
                              className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4"
                            >
                              <dt className="capitalize font-semibold text-gray-900">
                                {camelToTitleCase(prop)}
                              </dt>
                              <dd className="text-gray-700 sm:col-span-2">
                                {addUnitIfKuantitas(e.metadata[prop], prop)}
                              </dd>
                            </div>
                          ))}
                      </React.Fragment>
                    ))}
                  </details>

                  <div className="grid grid-cols-1 gap-1 py-3 ">
                    <div className="space-y-4">
                      <details className="group [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex cursor-pointer items-center justify-between gap-1.5 rounded-lg bg-slate-50 p-4 text-gray-900 border border-gray-300 outline-none">
                          <h3 className="flex items-center text-base capitalize font-semibold text-gray-700 dark:text-white">
                            Riwayat Produk :{" "}
                            <span className="font-medium ml-1">
                              {" "}
                              {e?.metadata?.jenisKopi
                                ? "Kopi " + e?.metadata?.jenisKopi
                                : e.productId}
                            </span>
                          </h3>

                          <svg
                            className="size-5 shrink-0 transition duration-300 group-open:-rotate-180"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </summary>

                        <dd className="text-gray-700 sm:col-span-2">
                          <div
                            className={`block mb-4 border-gray-400 pt-4 px-4 rounded-md grid  gap-x-5`}
                            key={index}
                          >
                            <div className="relative">
                              {sortedData.map((dt: any, index: number) => {
                                const isLastItem =
                                  index === e.status.length - 1 ||
                                  e.status !== histories[index + 1]?.status;
                                return (
                                  <div key={index}>
                                    {dt.status === "sending" && (
                                      <>
                                        <h3 className="mb-2 flex items-center text-lg capitalize font-semibold text-gray-700 dark:text-white">
                                          Tracking History <span className="lowercase mx-1"> to</span> {" "}{dt.role_receiver}{" "}{dt.to}
                                        </h3>
                                      </>
                                    )}
                                    <div
                                      className={`${
                                        dt.status === "confirmed" ||
                                        index === e.status.length - 1
                                          ? "mb-10  pb-5 border-gray-400"
                                          : "border-l  border-gray-400"
                                      } relative  pl-5 pb-4 ml-5`}
                                    >
                                      <div
                                        className={`${
                                          dt.status === "confirmed"
                                            ? "bg-green-400"
                                            : dt.status === "deleted"
                                              ? "bg-red-500"
                                              : index === e.status.length - 1
                                                ? "bg-yellow-400"
                                                : "bg-gray-400"
                                        } absolute w-2.5 h-2.5 ring-white ring-8 rounded-full mt-1.5 -left-[5px] z-10`}
                                      />
                                      <div
                                        className={`${
                                          index === e.status.length - 1
                                            ? "hidden"
                                            : "bg-gray-500"
                                        } absolute w-[2px] h-full hidden rounded-full mt-1.5 -left-[1px] `}
                                      />
                                      <p
                                        className={` ${
                                          dt.status === "confirmed"
                                            ? "text-green-400"
                                            : dt.status === "deleted"
                                              ? "text-red-500"
                                              : index === e.status.length - 1
                                                ? "text-yellow-400"
                                                : "text-gray-400"
                                        }   capitalize text-sm mb-1 w-fit rounded-md font-semibold`}
                                      >
                                        {dt.status}
                                      </p>
                                      {dt.status !== "confirmed" && (
                                        <>
                                          <time className="mb-2  font-normal leading-none text-gray-700 text-sm">
                                            {dt.time}
                                          </time>

                                          <p className="text-base font-normal text-gray-700 text-sm">
                                            {dt.note
                                              ? "Note : " + dt.note
                                              : null}
                                          </p>
                                        </>
                                      )}

                                      {(dt.status === "sending" ||
                                        index === 0) && (
                                        <>
                                          <p className=" py-1 flex items-center gap-x-2  font-medium capitalize text-sm">
                                            <span className="text-gray-700">
                                              Pengirim :
                                            </span>
                                            <span>{dt.from}</span>
                                            <span
                                              className={` ${getRoleColor(
                                                dt.role_sender,
                                              )}   capitalize text-[12px] w-fit px-2.5 p-0.5 rounded-xl font-semibold`}
                                            >
                                              {dt.role_sender}
                                            </span>
                                          </p>
                                        </>
                                      )}
                                      {dt.status === "confirmed" && (
                                        <>
                                          <div className="border border-gray-200 shadow-md max-w-2xl">
                                            <div className="grid grid-cols-1 gap-1 p-3 border-b border-gray-200 sm:grid-cols-3 sm:gap-4 bg-slate-100 font-semibold">
                                              <dt className="font-medium text-gray-900 capitalize">
                                                Penerima
                                              </dt>
                                              <dd className="text-gray-700 sm:col-span-2 space-x-3 flex items-center">
                                                <span>{dt.to}</span>
                                                <span
                                                  className={` ${getRoleColor(
                                                    dt.role_receiver,
                                                  )}   capitalize text-[12px]  w-fit px-2.5 p-0.5 rounded-xl font-semibold`}
                                                >
                                                  {dt.role_receiver}
                                                </span>
                                              </dd>
                                            </div>
                                            <div className="grid grid-cols-1 gap-1 p-3 border-b border-gray-200 sm:grid-cols-3 sm:gap-4">
                                              <dt className="font-medium text-gray-900 capitalize">
                                                Note
                                              </dt>
                                              <dd className="text-gray-700 sm:col-span-2 space-x-3 flex items-center">
                                                <span>{dt.note}</span>
                                              </dd>
                                            </div>
                                            <div className="grid grid-cols-1 gap-1 p-3 border-b border-gray-200 sm:grid-cols-3 sm:gap-4">
                                              <dt className="font-medium text-gray-900 capitalize">
                                                Waktu
                                              </dt>
                                              <dd className="text-gray-700 sm:col-span-2 space-x-3 flex items-center">
                                                <span>{dt.time}</span>
                                              </dd>
                                            </div>
                                            {Object.keys(groups).map(
                                              (groupName, groupIndex) => (
                                                <React.Fragment
                                                  key={groupIndex}
                                                >
                                                  {groupName ===
                                                    dt.role_receiver.toUpperCase() &&
                                                    groups[groupName].map(
                                                      (prop, propIndex) => {
                                                        const value = e.metadata[prop]

                                                        if (value === "" || value === 0 || value === undefined || value === null) {
                                                          return null; // Do not render anything
                                                        }

                                                        return (
                                                          <div
                                                            key={prop}
                                                            className="grid grid-cols-1 gap-1 p-3 border-b border-gray-200 sm:grid-cols-3 sm:gap-4"
                                                          >
                                                            <dt className="font-medium text-gray-900 capitalize">
                                                              {camelToTitleCase(
                                                                prop,
                                                              )}
                                                            </dt>
                                                            <dd className="text-gray-700 sm:col-span-2">
                                                              {addUnitIfKuantitas( e.metadata[prop], prop)}
                                                            </dd>
                                                          </div>
                                                        );
                                                      },
                                                    )}
                                                </React.Fragment>
                                              ),
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </dd>
                      </details>
                    </div>
                  </div>
                </dl>
              </div>
            );
          })
        ) : (
          <div className="text-4xl font-medium min-h-screen flex items-center justify-center">
            History Masih Kosong
          </div>
        )}
      </div>
    </>
  );
}
