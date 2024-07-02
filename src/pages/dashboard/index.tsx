import Swal from "sweetalert2";
import fs from "fs";
import path from "path";
import { Web3 } from "web3";
import { v4 } from "uuid";
import React, { useEffect, useState } from "react";
import { authStore } from "@/states/auth.state";
import { initialData } from "@/data/mataKuliah";
import { useRouter } from "next/router";
import { Navbar } from "@/components/custom/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  getRoleColor,
  getStatusColor,
  camelToTitleCase,
  addUnitIfKuantitas,
  initialState,
  groups,
} from "@/lib/helper";
import { adjustScores, fuzzySearch, konversiNilai } from "@/lib/fuzzy";
import {
  contractEthWithAddress,
  contractWithAddress,
} from "@/config/contract_connection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export async function getServerSideProps() {
  let abi;
  let deployed_address;
  try {
    deployed_address = fs.readFileSync(
      path.join(__dirname, "../../../scm_address.bin"),
    );
    abi = require("../../../scm.json");
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

async function getProducts(contract: any, address: any) {
  return contract.methods.getListProducts(address[0]).call();
}

async function getProfileData(contract, address) {
  return contract.methods.profileInformation(address[0]).call();
}

export async function ethEnabled() {
  if (window?.web3) {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    window.web3 = new Web3(window.ethereum);
    return window.web3;
  }
  return false;
}

export default function Dashboard({ abi, deployed_address, network }) {
  const contract = contractWithAddress(
    JSON.parse(abi),
    deployed_address,
    network,
  );

  const ethContract = contractEthWithAddress(abi, deployed_address, network);

  const { address, setAddress } = authStore();
  const { push } = useRouter();

  const [profile, setProfile] = useState({});
  const [productList, setListProduct] = useState([]);
  const [transaction, setTransaction] = useState();

  const [keyValue, setKeyValue] = useState({});
  const [metadata, setMetadata] = useState([]);
  const [wallet_id, setWalletId] = useState();
  const [permission, setPermission] = useState([]);
  console.warn("DEBUGPRINT[2]: index.tsx:94: permission=", permission);
  const [showModalUsers, setShowModalUsers] = useState(false);
  const [users, setUsers] = useState([]);
  const [productId, setProductId] = useState();
  const [showModalProductConfirmation, setShowModalProductConfirmation] =
    useState(false);
  const [prevOwner, setPrevOwner] = useState();
  const [showDeleteProduct, setShowDeleteProduct] = useState(false);
  const [showUpdateProduct, setShowUpdateProduct] = useState(false);
  const [_metadata, setMetadataDetail] = useState();
  const [_mtdta, setMtdta] = useState();

  const [_state, setState] = useState(initialState);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setState({
      ..._state,
      [name]: value,
    });
  };

  const [isModal, setIsModal] = useState({
    confirm_product: false,
    delete_product: false,
    update_product: false,
    kirim_barang: false,
  });

  useEffect(() => {
    (async () => {
      window.ethereum.on("accountsChanged", (args) => {
        let _address = [args[0]];
        setAddress(_address);
      });
      if (!window?.web3?.eth && address === "") {
        await ethEnabled();
        window?.web3?.eth?.getAccounts().then(async (accounts) => {
          setAddress(accounts);

          // const is_register = await contract.methods.checkLoginStatus(accounts)
        });
      }

      // setWalletId(v4());
      if (address.length !== 0 && address[0] !== null) {
        const login_status = await contract.methods
          .checkLoginStatus(address[0])
          .call();
        if (!login_status) return push("/login");
        const profile = await contract.methods
          .profileInformation(address[0])
          .call();
        setProfile({
          name: profile["3"],
          role: profile["2"],
          wallet_address: profile["0"],
        });

        const products: any = await getProducts(contract, address);

        let permission: any[] = await contract.methods
          .getPermissionByName(profile["2"])
          .call();
        if (permission.length > 0) {
          if (
            permission.indexOf("read") !== -1 &&
            permission.indexOf("transfer") !== -1 &&
            permission.indexOf("confirmation") !== -1 &&
            permission.indexOf("delete") !== -1 &&
            permission.indexOf("update") !== -1
          ) {
            permission = permission.concat([
              "read&transfer&confirmation&delete&update",
            ]);
          } else if (
            permission.indexOf("read") !== -1 &&
            permission.indexOf("transfer") !== -1 &&
            permission.indexOf("update") !== -1 &&
            permission.indexOf("confirmation") !== -1
          ) {
            permission = permission.concat([
              "read&transfer&update&confirmation",
            ]);
          } else if (
            permission.indexOf("read") !== -1 &&
            permission.indexOf("transfer") !== -1 &&
            permission.indexOf("confirmation") !== -1
          ) {
            permission = permission.concat(["read&transfer&confirmation"]);
          } else if (
            permission.indexOf("read") !== -1 &&
            permission.indexOf("confirmation") !== -1
          ) {
            permission = permission.concat(["read&confirmation"]);
          } else if (
            permission.indexOf("read") !== -1 &&
            permission.indexOf("transfer")
          ) {
            permission = permission.concat("read&transfer");
          }
          // console.log(permission);
        }

        // console.log(permission.findIndex("read"))
        setPermission(permission);

        // const role: any = await getProfileData(contract, address);
        const data = await Promise.all(
          products.map(async (p) => {
            let getSender = null;
            try {
              getSender = await contract.methods
                .profileInformation(p[2])
                .call();
            } catch (error) {
              console.error("Error fetching profile information:", error);
            }
            return { ...p, getSender };
          }),
        );

        const filter_products: any = data?.filter(
          (d) => d.owner === address[0],
        );

        setListProduct(profile.role === "Admin" ? products : filter_products);

        ethContract.on(
          "productTransaction",
          async (sender, product_id, status, note) => {
            console.log(
              "note:",
              note,
              "status:",
              status,
              "product_id:",
              product_id,
              "sender:",
              sender,
            );
            const products: any = await getProducts(contract, address);
            // const role: any = await getProfileData(contract, address);
            const filter_products: any = products.filter(
              (d) => d.owner === address[0],
            );

            setListProduct(
              profile.role === "Admin" ? products : filter_products,
            );

            if (sender !== address[0] && profile?.role === "Admin") {
              Swal.fire({
                icon: "info",
                text: `Pengajuan dari ${sender} `,
              });
            }
            if (profile?.role === "Mahasiswa" && sender !== address[0]) {
              Swal.fire({
                icon: "info",
                text: `Update dari Admin `,
                // text: `Barang ${product_id} telah dikonfirmasi oleh ${sender} `,
              });
            }
          },
        );
      } else {
        // return push("/login");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, transaction]);

  const [notesConfirm, setNotesConfirm] = useState("");

  useEffect(() => {
    (async () => {
      const users: any = await contract.methods.getUsers().call();
      setUsers(users);
    })();
  }, [showModalUsers]);

  return (
    <>
      <Dialog
        open={isModal.kirim_barang}
        onOpenChange={() =>
          setIsModal((prevState) => ({
            ...prevState,
            kirim_barang: !prevState.kirim_barang,
          }))
        }
      >
        <DialogContent className=" sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pilih penerima barang</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
              <thead className="text-left">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2 font-bold text-gray-900">
                    Name
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-bold text-gray-900">
                    Role
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-bold text-gray-900">
                    Address
                  </th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {users?.map((d) => {
                  if (d.id !== profile?.wallet_address && d.role !== "PETANI") {
                    return (
                      <tr key={d.id}>
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                          {d?.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {d?.role}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700 max-w-[100px] truncate">
                          {d?.id}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2">
                          <button
                            onClick={async () => {
                              Swal.showLoading();
                              try {
                                await contract.methods
                                  .sendProduct(d?.id, productId, "", _mtdta)
                                  .send({
                                    from: address[0],
                                    gas: "2000000",
                                  });
                                Swal.fire({
                                  title: "Berhasil mengirim barang",
                                  icon: "success",
                                });
                                setIsModal((prevState) => ({
                                  ...prevState,
                                  kirim_barang: !prevState.kirim_barang,
                                }));
                                setShowModalUsers(false);

                                const products: any = await getProducts(
                                  contract,
                                  address,
                                );
                                const data = await Promise.all(
                                  products.map(async (p) => {
                                    let getSender = null;
                                    try {
                                      getSender = await contract.methods
                                        .profileInformation(p[2])
                                        .call();
                                    } catch (error) {
                                      console.error(
                                        "Error fetching profile information:",
                                        error,
                                      );
                                    }
                                    return { ...p, getSender };
                                  }),
                                );

                                const filter_products: any = data?.filter(
                                  (d) => d.owner === address[0],
                                );

                                setListProduct(
                                  profile.role === "Admin"
                                    ? products
                                    : filter_products,
                                );
                              } catch (error: any) {
                                Swal.hideLoading();
                                return Swal.fire({
                                  icon: "error",
                                  title: error,
                                });
                              }
                            }}
                            className="inline-block rounded bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                          >
                            Kirim
                          </button>
                        </td>
                      </tr>
                    );
                  } else if (d.id === profile?.wallet_address) {
                    return (
                      <tr
                        key={d.id}
                        className={
                          d.id === profile?.wallet_address ? "hidden" : ""
                        }
                      >
                        <td
                          colSpan="4"
                          className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 text-center"
                        >
                          User not found
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isModal.confirm_product}
        onOpenChange={() =>
          setIsModal((prevState) => ({
            ...prevState,
            confirm_product: !prevState.confirm_product,
          }))
        }
      >
        <DialogContent className=" sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Konfirmasi Produk</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-1.5 text-amber-700 w-fit">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="-ms-1 me-1.5 h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 9.75h4.875a2.625 2.625 0 010 5.25H12M8.25 9.75L10.5 7.5M8.25 9.75L10.5 12m9-7.243V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"
              />
            </svg>

            <p className="whitespace-nowrap text-sm">
              Pastikan barang telah sesuai
            </p>
          </span>
          <div>
            <label
              htmlFor="OrderNotes"
              className="block text-sm font-medium text-gray-700"
            >
              Notes
            </label>

            <textarea
              onChange={(e) => setNotesConfirm(e.target.value)}
              id="OrderNotes"
              className="mt-1.5 p-2 w-full border rounded-lg border-gray-300 align-top shadow-sm sm:text-sm"
              rows="4"
              placeholder="Enter any additional order notes..."
            ></textarea>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={async () => {
                try {
                  Swal.showLoading();
                  const _data = {
                    product_id: productId,
                    note: notesConfirm,
                    prev_owner: prevOwner,
                  };
                  await contract.methods
                    .confirmationProduct(
                      _data.prev_owner,
                      _data.product_id,
                      _data.note,
                      _mtdta,
                    )
                    .send({
                      from: address[0],
                      gas: "2000000",
                    });

                  setIsModal((prevState) => ({
                    ...prevState,
                    confirm_product: !prevState.confirm_product,
                  }));
                  setShowModalProductConfirmation(false);
                  const products: any = await getProducts(contract, address);
                  const data = await Promise.all(
                    products.map(async (p) => {
                      let getSender = null;
                      try {
                        getSender = await contract.methods
                          .profileInformation(p[2])
                          .call();
                      } catch (error) {
                        console.error(
                          "Error fetching profile information:",
                          error,
                        );
                      }
                      return { ...p, getSender };
                    }),
                  );

                  const filter_products: any = data?.filter(
                    (d) => d.owner === address[0],
                  );

                  setListProduct(
                    profile.role === "Admin" ? products : filter_products,
                  );

                  Swal.hideLoading();
                  Swal.fire({
                    icon: "success",
                    title: "Berhasil konfirmasi barang",
                  });
                } catch (error: any) {
                  console.error(error);
                  Swal.fire({
                    icon: "error",
                    title: error,
                  });
                }
              }}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isModal.delete_product}
        onOpenChange={() =>
          setIsModal((prevState) => ({
            ...prevState,
            delete_product: !prevState.delete_product,
          }))
        }
      >
        <DialogContent className=" sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Hapus Produk</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-1.5 text-amber-700 w-fit">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="-ms-1 me-1.5 h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 9.75h4.875a2.625 2.625 0 010 5.25H12M8.25 9.75L10.5 7.5M8.25 9.75L10.5 12m9-7.243V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"
              />
            </svg>

            <p className="whitespace-nowrap text-sm">Maksukan alasan</p>
          </span>
          <div>
            <label
              htmlFor="OrderNotes"
              className="block text-sm font-medium text-gray-700"
            >
              Notes
            </label>

            <textarea
              onChange={(e) => setNotesConfirm(e.target.value)}
              id="OrderNotes"
              className="mt-1.5 p-2 w-full border rounded-lg border-gray-300 align-top shadow-sm sm:text-sm"
              rows="4"
              placeholder="Enter any additional order notes..."
            ></textarea>
          </div>

          <DialogFooter>
            <Button
              className="bg-red-700 hover:bg-red-600 active:bg-red-600"
              type="button"
              onClick={async () => {
                try {
                  Swal.showLoading();
                  const _data = {
                    product_id: productId,
                    note: notesConfirm,
                    prev_owner: prevOwner,
                  };
                  await contract.methods
                    .deleteProduct(productId, _data.note, _mtdta)
                    .send({
                      from: address[0],
                      gas: "2000000",
                    });

                  setShowModalProductConfirmation(false);
                  setIsModal((prevState) => ({
                    ...prevState,
                    delete_product: !prevState.delete_product,
                  }));
                  const products: any = await getProducts(contract, address);
                  const data = await Promise.all(
                    products.map(async (p) => {
                      let getSender = null;
                      try {
                        getSender = await contract.methods
                          .profileInformation(p[2])
                          .call();
                      } catch (error) {
                        console.error(
                          "Error fetching profile information:",
                          error,
                        );
                      }
                      return { ...p, getSender };
                    }),
                  );

                  const filter_products: any = data?.filter(
                    (d) => d.owner === address[0],
                  );

                  setListProduct(
                    profile.role === "Admin" ? products : filter_products,
                  );

                  Swal.hideLoading();
                  Swal.fire({
                    icon: "success",
                    title: "Berhasil Hapus barang",
                  });
                } catch (error: any) {
                  console.error(error);
                  Swal.fire({
                    icon: "error",
                    title: error,
                  });
                }
              }}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isModal.update_product}
        onOpenChange={() =>
          setIsModal((prevState) => ({
            ...prevState,
            update_product: !prevState.update_product,
          }))
        }
      >
        <DialogContent className=" sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Produk</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div>
            <div className="space-y-2 mx-4">
              {profile?.role ===
                "PENGOLAH" && // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted
              (
                // biome-ignore format: the code should not be formatted
                <>
                        <h2 className="font-bold">Pengolah</h2>
                        <div className="space-y-0.5">
                        <Label>Nama Pengolah</Label>
                        <Input name="namaPengolah" value={_state.namaPengolah} onChange={handleChange} placeholder="Nama Pengolah" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Metode Pengolahan</Label>
                        <Input name="metodePengolahan" value={_state.metodePengolahan} onChange={handleChange} placeholder="Metode Pengolahan" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Tanggal Pengolahan</Label>
                        <Input type="date" name="tanggalPengolahan" value={_state.tanggalPengolahan} onChange={handleChange} placeholder="Tanggal Pengolahan" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Kuantitas Biji Kopi Yang Diolah</Label>
                        <Input name="kuantitasBijiKopiYangDiolah" value={_state.kuantitasBijiKopiYangDiolah} onChange={handleChange} placeholder="Kuantitas Biji Kopi Yang Diolah" type="number" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Kualitas Biji Kopi</Label>
                        <Input name="kualitasBijiKopi" value={_state.kualitasBijiKopi} onChange={handleChange} placeholder="Kualitas Biji Kopi" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Catatan Pengolahan</Label>
                        <Input name="catatanPengolahan" value={_state.catatanPengolahan} onChange={handleChange} placeholder="Catatan Pengolahan" />
                        </div>
                    </>
              )}

              {profile?.role ===
                "PENGEKSPOR" && // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted
              (
                // biome-ignore format: the code should not be formatted
                <>
                        <h2 className="font-bold">Pengekspor</h2>
                        <div className="space-y-0.5">
                        <Label>Nama Pengekspor</Label>
                        <Input name="namaPengekspor" value={_state.namaPengekspor} onChange={handleChange} placeholder="Nama Pengekspor" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Negara Tujuan</Label>
                        <Input name="negaraTujuan" value={_state.negaraTujuan} onChange={handleChange} placeholder="Negara Tujuan" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Kuantitas Ekspor</Label>
                        <Input name="kuantitasEkspor" value={_state.kuantitasEkspor} onChange={handleChange} placeholder="Kuantitas Ekspor" type="number" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Tanggal Ekspor</Label>
                        <Input type="date" name="tanggalEkspor" value={_state.tanggalEkspor} onChange={handleChange} placeholder="Tanggal Ekspor" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Nomor Kontainer</Label>
                        <Input name="nomorKontainer" value={_state.nomorKontainer} onChange={handleChange} placeholder="Nomor Kontainer" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Sertifikasi</Label>
                        <Input name="sertifikasi" value={_state.sertifikasi} onChange={handleChange} placeholder="Sertifikasi" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Dokumen Pendukung</Label>
                        <Input name="dokumenPendukung" value={_state.dokumenPendukung} onChange={handleChange} placeholder="Dokumen Pendukung" />
                        </div>
                    </>
              )}

              {profile?.role ===
                "IMPORTIR" && // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted
              (
                // biome-ignore format: the code should not be formatted
                <>
                        <h2 className="font-bold">Importir</h2>
                        <div className="space-y-0.5">
                        <Label>Nama Importir</Label>
                        <Input name="namaImportir" value={_state.namaImportir} onChange={handleChange} placeholder="Nama Importir" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Negara Asal</Label>
                        <Input name="negaraAsal" value={_state.negaraAsal} onChange={handleChange} placeholder="Negara Asal" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Kuantitas Impor</Label>
                        <Input name="kuantitasImpor" value={_state.kuantitasImpor} onChange={handleChange} placeholder="Kuantitas Impor" type="number" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Tanggal Impor</Label>
                        <Input type="date" name="tanggalImpor" value={_state.tanggalImpor} onChange={handleChange} placeholder="Tanggal Impor" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Nomor Kontainer</Label>
                        <Input name="nomorKontainer" value={_state.nomorKontainer} onChange={handleChange} placeholder="Nomor Kontainer" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Sertifikasi</Label>
                        <Input name="sertifikasi" value={_state.sertifikasi} onChange={handleChange} placeholder="Sertifikasi" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Dokumen Pendukung</Label>
                        <Input name="dokumenPendukung" value={_state.dokumenPendukung} onChange={handleChange} placeholder="Dokumen Pendukung" />
                        </div>
                    </>
              )}

              {profile?.role ===
                "DISTRIBUTOR" && // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted
              (
                // biome-ignore format: the code should not be formatted
                <>
                        <h2 className="font-bold">Distributor</h2>
                        <div className="space-y-0.5">
                        <Label>Nama Distributor</Label>
                        <Input name="namaDistributor" value={_state.namaDistributor} onChange={handleChange} placeholder="Nama Distributor" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Kuantitas Distribusi</Label>
                        <Input name="kuantitasDistribusi" value={_state.kuantitasDistribusi} onChange={handleChange} placeholder="Kuantitas Distribusi" type="number" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Tanggal Distribusi</Label>
                        <Input type="date" name="tanggalDistribusi" value={_state.tanggalDistribusi} onChange={handleChange} placeholder="Tanggal Distribusi" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Lokasi Tujuan</Label>
                        <Input name="lokasiTujuan" value={_state.lokasiTujuan} onChange={handleChange} placeholder="Lokasi Tujuan" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Kondisi Penyimpanan</Label>
                        <Input name="kondisiPenyimpanan" value={_state.kondisiPenyimpanan} onChange={handleChange} placeholder="Kondisi Penyimpanan" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Catatan Pengiriman</Label>
                        <Input name="catatanPengiriman" value={_state.catatanPengiriman} onChange={handleChange} placeholder="Catatan Pengiriman" />
                        </div>
                    </>
              )}

              {profile?.role ===
                "RETAILER" && // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted
              (
                // biome-ignore format: the code should not be formatted
                <>
                        <h2 className="font-bold">Retailer</h2>
                        <div className="space-y-0.5">
                        <Label>Nama Retailer</Label>
                        <Input name="namaRetailer" value={_state.namaRetailer} onChange={handleChange} placeholder="Nama Retailer" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Lokasi Toko</Label>
                        <Input name="lokasiToko" value={_state.lokasiToko} onChange={handleChange} placeholder="Lokasi Toko" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Jenis Kopi Yang Dijual</Label>
                        <Input name="jenisKopiYangDijual" value={_state.jenisKopiYangDijual} onChange={handleChange} placeholder="Jenis Kopi Yang Dijual" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Kuantitas Stok</Label>
                        <Input name="kuantitasStok" value={_state.kuantitasStok} onChange={handleChange} placeholder="Kuantitas Stok" type="number" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Harga Jual</Label>
                        <Input name="hargaJual" value={_state.hargaJual} onChange={handleChange} placeholder="Harga Jual" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Tanggal Penjualan</Label>
                        <Input type="date" name="tanggalPenjualan" value={_state.tanggalPenjualan} onChange={handleChange} placeholder="Tanggal Penjualan" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Catatan Penjualan</Label>
                        <Input name="catatanPenjualan" value={_state.catatanPenjualan} onChange={handleChange} placeholder="Catatan Penjualan" />
                        </div>
                    </>
              )}

              {profile?.role ===
                "KONSUMEN" && // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted
              (
                // biome-ignore format: the code should not be formatted
                <>
                        <h2 className="font-bold">Konsumen</h2>
                        <div className="space-y-0.5">
                        <Label>Nama Konsumen</Label>
                        <Input name="namaKonsumen" value={_state.namaKonsumen} onChange={handleChange} placeholder="Nama Konsumen" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Jenis Kopi Yang Dibeli</Label>
                        <Input name="jenisKopiYangDibeli" value={_state.jenisKopiYangDibeli} onChange={handleChange} placeholder="Jenis Kopi Yang Dibeli" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Tanggal Pembelian</Label>
                        <Input type="date" name="tanggalPembelian" value={_state.tanggalPembelian} onChange={handleChange} placeholder="Tanggal Pembelian" />
                        </div>
                        <div className="space-y-0.5">
                        <Label>Ulasan Produk</Label>
                        <Input name="ulasanProduk" value={_state.ulasanProduk} onChange={handleChange} placeholder="Ulasan Produk" />
                        </div>
                    </>
              )}

              <div className="h-2"></div>
              <Button
                className="bg-blue-700 hover:bg-blue-600 active:bg-blue-600"
                onClick={() => {
                  const product = JSON.stringify(_state).replace(/"/g, "'");

                  setIsModal((prevState) => ({
                    ...prevState,
                    update_product: !prevState.update_product,
                  }));
                  Swal.fire({
                    icon: "info",
                    title: "Apakah anda yakin akan menyimpannya ?",
                    //text: "Produk yang akan disimpan tidak dapat diubah",
                  }).then(async (res) => {
                    // if (res.isConfirmed) {
                    if (res.isConfirmed) {
                      // return null;
                      // let _metadata = metadata.concat(keyValue);
                      // setMetadata(_metadata)
                      const res = await contract.methods
                        .updateProduct(productId, product)
                        .send({
                          from: address[0],
                          gas: "1400000",
                        });
                      Swal.fire({
                        icon: "success",
                        title: "Berhasil mengupdate barang",
                      });
                      setTransaction(res);
                      // setNewmtda(initState);
                    }
                  });
                }}
              >
                Simpan Produk
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/*NAVBAR*/}
      <Navbar />

      <div className="container mx-auto my-4">
        <div className="flex flex-col mb-8">
          <span className="text-xl font-semibold text-gray-800 mb-4">
            Informasi Pengguna
          </span>

          <div className="flow-root rounded-lg border border-gray-300 py-3 shadow-xl">
            <dl className="-my-3 divide-y divide-gray-100 text-sm">
              <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4">
                <dt className="font-medium text-gray-900">Wallet Address</dt>
                <dd className="text-gray-700 sm:col-span-2">
                  {profile?.wallet_address}
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4">
                <dt className="font-medium text-gray-900">Nama</dt>
                <dd className="text-gray-700 sm:col-span-2">{profile?.name}</dd>
              </div>

              <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4">
                <dt className="font-medium text-gray-900">Role Sebagai</dt>
                <dd className="text-gray-700 sm:col-span-2">
                  <span
                    className={` ${getRoleColor(
                      profile?.role?.toLowerCase(),
                    )}   capitalize text-[12px] w-fit px-2.5 p-1.5 rounded-xl font-semibold`}
                  >
                    {profile?.role}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
        {permission.map((e) => (
          <div key={e}>
            {e === "write" ? (
              <div className="flex flex-row gap-8 h-full w-full">
                <div className=" space-y-4 max-w-md">
                  <details className="group [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex gap-x-3 cursor-pointer items-center">
                      <h3 className="text-xl font-semibold text-gray-800 ">
                        Add Product
                      </h3>

                      <span className="shrink-0 rounded-lg group-open:rounded-full bg-blue-700 duration-300 text-white  p-0.5 ">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 shrink-0 transition duration-300 group-open:-rotate-45 "
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    </summary>

                    <div>
                      <div className="space-y-2 mx-4">
                        {profile?.role ===
                          "PETANI" && // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted // biome-ignore format: the code should not be formatted
                        (
                            // biome-ignore format: the code should not be formatted
                            <>
                              <h2 className="font-bold">Petani</h2>
                              <div className="space-y-0.5">
                                <Label>Nama Petani</Label>
                                <Input name="namaPetani" value={_state.namaPetani} onChange={handleChange} placeholder="Nama Petani" />
                              </div>
                              <div className="space-y-0.5">
                                <Label>Lokasi Kebun</Label>
                                <Input name="lokasiKebun" value={_state.lokasiKebun} onChange={handleChange} placeholder="Lokasi Kebun" />
                              </div>
                              <div className="space-y-0.5">
                                <Label>Jenis Kopi</Label>
                                <Input name="jenisKopi" value={_state.jenisKopi} onChange={handleChange} placeholder="Jenis Kopi" />
                              </div>
                              <div className="space-y-0.5">
                                <Label>Tanggal Tanam</Label>
                                <Input type="date" name="tanggalTanam" value={_state.tanggalTanam} onChange={handleChange} placeholder="Tanggal Tanam" />
                              </div>
                              <div className="space-y-0.5">
                                <Label>Tanggal Panen</Label>
                                <Input type="date" name="tanggalPanen" value={_state.tanggalPanen} onChange={handleChange} placeholder="Tanggal Panen" />
                              </div>
                              <div className="space-y-0.5">
                                <Label>Kuantitas Hasil Panen</Label>
                                <Input name="kuantasHasilPanen" value={_state.kuantasHasilPanen} onChange={handleChange} placeholder="Kuantitas Hasil Panen" type="number" />
                              </div>
                              <div className="space-y-0.5">
                                <Label>kondisiCuaca</Label>
                                <Input name="kondisiCuaca" value={_state.kondisiCuaca} onChange={handleChange} placeholder="Kondisi Cuaca" />
                              </div>
                              <div className="space-y-0.5">
                                <Label>Catatan Perawatan</Label>
                                <Input name="catatanPerawatan" value={_state.catatanPerawatan} onChange={handleChange} placeholder="Catatan Perawatan" />
                              </div>
                            </>
                          )}

                        <div className="h-2"></div>
                        <Button
                          onClick={() => {
                            const product = JSON.stringify(_state).replace(
                              /"/g,
                              "'",
                            );

                            console.log(product);
                            Swal.fire({
                              icon: "info",
                              title: "Apakah anda yakin akan menyimpannya ?",
                              text: "Produk Yang akan disimpan tidak dapat diubah",
                            }).then(async (res) => {
                              // if (res.isConfirmed) {
                              if (res.isConfirmed) {
                                // return null;
                                // let _metadata = metadata.concat(keyValue);
                                // setMetadata(_metadata)
                                const res = await contract.methods
                                  .createProduct(v4(), product)
                                  .send({
                                    from: address[0],
                                    gas: "1400000",
                                  });
                                console.log(res);
                                Swal.fire({
                                  icon: "success",
                                  title: "Berhasil menambahkan barang",
                                });
                                setTransaction(res);
                                // setNewmtda(initState);
                              }
                            });
                          }}
                        >
                          Simpan Produk
                        </Button>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            ) : (
              <></>
            )}
            {e === "read&transfer" ||
            e === "read&transfer&confirmation" ||
            e === "read&transfer&confirmation&delete&update" ||
            e === "read&confirmation" ||
            e === "read&transfer&update&confirmation" ? (
              <div className="flex flex-col mt-8">
                <span className="text-xl font-semibold text-gray-800 mb-6">
                  Daftar produk
                </span>
                {productList.map((p) => {
                  console.warn("DEBUGPRINT[1]: index.tsx:1399: p=", p);
                  const json = p[4];
                  const validJsonString = json.replace(/'/g, '"');
                  const parsed = JSON.parse(validJsonString);

                  return (
                    <div
                      key={p.id}
                      className={`mb-8 flow-root rounded-lg border border-gray-200 px-3 py-5 shadow-lg hover:shadow-cyan-700 duration-300`}
                    >
                      <dl className="text-sm">
                        {profile?.role !== "PETANI" && (
                          <details className=" divide-y divide-gray-200  grid grid-cols-1 gap-1  sm:gap-4 items-center group [&_summary::-webkit-details-marker]:hidden mb-2">
                            <summary className="flex cursor-pointer items-center justify-between gap-1.5 rounded-lg bg-slate-50 p-4 text-gray-900 border border-gray-300 outline-none">
                              <h3
                                onClick={() => console.log(p.getSender)}
                                className="flex items-center text-base capitalize font-semibold text-gray-700 dark:text-white"
                              >
                                Data Pengirim
                                <span className="font-medium"> </span>
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

                            <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4 items-center border-b border-gray-300">
                              <dt className="font-semibold text-gray-900">
                                Address
                              </dt>
                              <dd className="text-gray-700 sm:col-span-2">
                                {p?.getSender?.id}
                              </dd>
                            </div>
                            <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4 items-center border-b border-gray-300">
                              <dt className="font-semibold text-gray-900">
                                Nama
                              </dt>
                              <dd className="text-gray-700 sm:col-span-2">
                                {p?.getSender?.name}
                              </dd>
                            </div>
                            <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4 items-center border-b border-gray-300">
                              <dt className="font-semibold text-gray-900">
                                Role
                              </dt>
                              <dd className="text-gray-700 sm:col-span-2">
                                <span
                                  className={` ${getStatusColor(p[3])} rounded-md py-1.5 px-2.5 font-semibold capitalize`}
                                >
                                  {p?.getSender?.role.toLowerCase()}
                                </span>
                              </dd>
                            </div>
                          </details>
                        )}
                        {profile?.role !== "PETANI" && (
                          <details
                            className=" divide-y divide-gray-200  grid grid-cols-1 gap-1  sm:gap-4 items-center group [&_summary::-webkit-details-marker]:hidden mb-2"
                            open
                          >
                            <summary className="flex cursor-pointer items-center justify-between gap-1.5 rounded-lg bg-slate-50 p-4 text-gray-900 border border-gray-300 outline-none">
                              <h3
                                onClick={() => console.log(getSender)}
                                className="flex items-center text-base capitalize font-semibold text-gray-700 dark:text-white"
                              >
                                Data Produk
                                <span className="font-medium"> </span>
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

                            {Object.keys(groups).map(
                              (groupName, groupIndex) => (
                                <React.Fragment key={groupIndex}>
                                  {groupName === "PETANI" &&
                                    profile?.role !== "PETANI" &&
                                    groups[groupName].map((prop, propIndex) => (
                                      <div
                                        key={propIndex + groupName}
                                        className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4"
                                      >
                                        <dt className="capitalize font-semibold text-gray-900">
                                          {camelToTitleCase(prop)}
                                        </dt>
                                        <dd className="text-gray-700 sm:col-span-2">
                                          {addUnitIfKuantitas(
                                            parsed[prop],
                                            prop,
                                          )}
                                        </dd>
                                      </div>
                                    ))}
                                </React.Fragment>
                              ),
                            )}
                          </details>
                        )}

                        {profile?.role !== "KONSUMEN" && (
                          <details className=" divide-y divide-gray-200  grid grid-cols-1 gap-1  sm:gap-4 items-center group [&_summary::-webkit-details-marker]:hidden">
                            <summary className="flex cursor-pointer items-center justify-between gap-1.5 rounded-lg bg-slate-50 p-4 text-gray-900 border border-gray-300 outline-none">
                              <h3 className="flex items-center text-base capitalize font-semibold text-gray-700 dark:text-white">
                                Data {profile?.role.toLowerCase()}
                                <span className="font-medium"> </span>
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

                            {Object.keys(groups).map(
                              (groupName, groupIndex) => (
                                <React.Fragment key={groupIndex}>
                                  {groupName === profile?.role &&
                                    groups[groupName].map((prop, propIndex) => {
                                      const value = parsed[prop];
                                      if (
                                        value === "" ||
                                        value === 0 ||
                                        value === undefined ||
                                        value === null
                                      ) {
                                        return null; // Do not render anything
                                      }
                                      return (
                                        <div
                                          key={propIndex + groupName}
                                          className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4"
                                        >
                                          <dt className="capitalize font-semibold text-gray-900">
                                            {camelToTitleCase(prop)}
                                          </dt>
                                          <dd className="text-gray-700 sm:col-span-2">
                                            {addUnitIfKuantitas(
                                              parsed[prop],
                                              prop,
                                            )}
                                          </dd>
                                        </div>
                                      );
                                    })}
                                </React.Fragment>
                              ),
                            )}
                          </details>
                        )}
                        <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4 items-center border-b border-gray-300">
                          <dt className="font-semibold text-gray-900">
                            Status
                          </dt>
                          <dd className="sm:col-span-2">
                            <span
                              className={` ${getStatusColor(p[3])} rounded-md py-1.5 px-2.5 font-semibold capitalize`}
                            >
                              {p[3].toLowerCase()}
                            </span>
                          </dd>
                        </div>
                        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-3 sm:gap-4 items-center border-b border-gray-300">
                          <dt className="font-semibold text-gray-900">Aksi</dt>
                          <dd className="text-gray-700 sm:col-span-2">
                            <div className="grid grid-cols-2 sm:grid-cols-4 max-w-sm  gap-3">
                              {/* {(e === "update" || e === "read&transfer&update&confirmation") ? <Button>Ubah</Button> : <></>} */}
                              {e === "read&transfer&confirmation" ||
                              e ===
                                "read&transfer&confirmation&delete&update" ||
                              e === "read&confirmation" ||
                              e === "read&transfer&update&confirmation" ? (
                                <Button
                                  onClick={async () => {
                                    const json = p[4];
                                    const validJsonString = json.replace(
                                      /'/g,
                                      '"',
                                    );
                                    const parsed = JSON.parse(validJsonString);
                                    setShowModalProductConfirmation(true);
                                    setProductId(p[0]);
                                    setPrevOwner(p[2]);
                                    setMtdta(p[4]);
                                    setIsModal((prevState) => ({
                                      ...prevState,
                                      confirm_product:
                                        !prevState.confirm_product,
                                    }));
                                  }}
                                  className="bg-green-700 hover:bg-green-600 active:bg-green-600"
                                  disabled={
                                    p[3] === "CONFIRMED" ||
                                    (p[3] === "SENDING" &&
                                      address[0] !== p[2]) ||
                                    p[2] === address[0]
                                  }
                                >
                                  Konfirmasi
                                </Button>
                              ) : (
                                <></>
                              )}

                              {e ===
                              "read&transfer&confirmation&delete&update" ? (
                                <Button
                                  className="bg-red-700 hover:bg-red-600 active:bg-red-600"
                                  onClick={() => {
                                    setIsModal((prevState) => ({
                                      ...prevState,
                                      delete_product: !prevState.delete_product,
                                    }));
                                    setShowDeleteProduct(true);
                                    setMtdta(p[4]);
                                    setProductId(p[0]);
                                  }}
                                >
                                  Hapus
                                </Button>
                              ) : (
                                <></>
                              )}
                              {e ===
                                "read&transfer&confirmation&delete&update" ||
                              e === "read&transfer&update&confirmation" ? (
                                <Button
                                  className="bg-slate-700 hover:bg-slate-600 active:bg-slate-600"
                                  onClick={() => {
                                    const json = p[4];
                                    const validJsonString = json.replace(
                                      /'/g,
                                      '"',
                                    );
                                    const parsed = JSON.parse(validJsonString);
                                    setState(parsed);
                                    setIsModal((prevState) => ({
                                      ...prevState,
                                      update_product: !prevState.update_product,
                                    }));
                                    setShowUpdateProduct(true);
                                    setMetadataDetail(p[4]);
                                    setProductId(p[0]);
                                  }}
                                >
                                  Update
                                </Button>
                              ) : (
                                <></>
                              )}
                              {e === "read&transfer" ||
                              e === "read&transfer&confirmation" ||
                              e ===
                                "read&transfer&confirmation&delete&update" ||
                              e === "read&transfer&update&confirmation" ? (
                                <Button
                                  className="bg-blue-700 hover:bg-blue-600 active:bg-blue-600"
                                  disabled={
                                    p[3] === "CONFIRMED" && address[0] === p[2]
                                  }
                                  onClick={async () => {
                                    const json = p[4];
                                    const validJsonString = json.replace(
                                      /'/g,
                                      '"',
                                    );

                                    const getSender = await contract.methods
                                      .profileInformation(p[2])
                                      .call();
                                    console.warn(
                                      "DEBUGPRINT[2]: index.tsx:1250: getSender=",
                                      getSender,
                                    );
                                    const parsed = JSON.parse(validJsonString);
                                    console.warn(
                                      "DEBUGPRINT[1]: index.tsx:1249: parsed=",
                                      parsed,
                                    );
                                    setShowModalUsers(true);
                                    setProductId(p[0]);
                                    setMtdta(p[4]);
                                    setIsModal((prevState) => ({
                                      ...prevState,
                                      kirim_barang: !prevState.kirim_barang,
                                    }));
                                  }}
                                >
                                  Kirim
                                </Button>
                              ) : (
                                <></>
                              )}
                            </div>
                          </dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            ) : (
              <></>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
