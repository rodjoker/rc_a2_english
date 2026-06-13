import Image from 'next/image'
import LoginForm from './LoginForm'
import bgImage from '@/app/assets/bg_login_english.png'

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      {/* Background */}
      <Image
        src={bgImage}
        alt=""
        fill
        className="object-cover object-center"
        priority
      />
      {/* Subtle overlay for card readability */}
      <div className="absolute inset-0 bg-black/25" />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-zinc-500">Ingresa tus credenciales para continuar</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
