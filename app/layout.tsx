import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GreenTech - Asociación de Usuarios de Plantas Medicinales',
  description: 'Portal de la Asociación de Usuarios de Plantas Medicinales GreenTech',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
