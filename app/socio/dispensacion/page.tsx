'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DispencionRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/socio/solicitud' + window.location.search)
  }, [router])
  return null
}
