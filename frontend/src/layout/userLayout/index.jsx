import React from 'react'
import NavbarComponents from "@/components/navbar"

export default function UserLayout({children}) {
  return (
    <div>
      <NavbarComponents />
      {children}
    </div>
  )
}
