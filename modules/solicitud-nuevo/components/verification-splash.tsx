import Image from 'next/image'

export default function VerificationSplash() {
  return (
    <div className="relative hidden min-h-80 min-w-0 overflow-hidden rounded-2xl bg-muted lg:block" data-testid="verification-splash">
      <Image
        src="/images/splash.jpg"
        alt="Estudiantes frente al Centro de Idiomas de la Universidad Nacional del Callao"
        fill
        sizes="(min-width: 1024px) 480px, 100vw"
        className="object-cover object-center dark:brightness-[0.2] dark:grayscale"
      />
    </div>
  )
}
