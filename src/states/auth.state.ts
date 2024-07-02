import { create } from "zustand"
import { persist } from "zustand/middleware"

export const authStore = create(persist(
    (set: any, get: any) => ({
        address:"",
        setAddress: (address: string) => set({ address }),
        isOwner: false,
        setOwner: (isOwner: boolean) => set({isOwner}) 
    }),{
        name:"auth"
    }
))