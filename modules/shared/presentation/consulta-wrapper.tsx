import { Lock } from "lucide-react"
import Copyright from "./copyright"
import Image, { getImageProps } from "next/image"

interface ConsultaPageProps {
    children: React.ReactNode
}

export default function ConsultaPage({ children }: ConsultaPageProps) 
{
    const wideImage = getImageProps({
        src: "/images/splash-wide.jpg",
        alt: "Estudiantes frente al Centro de Idiomas de la Universidad Nacional del Callao",
        fill: true,
        sizes: "(min-aspect-ratio: 8/3) 50vw, 134vh",
    }).props

    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <div className="flex flex-col gap-6">
                            <div className="flex justify-center">
                                <Lock className="h-12 w-12 text-primary" />
                            </div>
                            {children}
                        </div>
                        <Copyright />
                    </div>
                </div>
            </div>
            <div className="relative hidden min-w-0 overflow-hidden bg-muted lg:block">
                <picture className="absolute inset-0 block">
                <source media="(min-aspect-ratio: 3/2)" srcSet={wideImage.srcSet} sizes={wideImage.sizes} />
                <Image
                    src="/images/splash.jpg"
                    alt="Estudiantes frente al Centro de Idiomas de la Universidad Nacional del Callao"
                    fill
                    sizes="(min-aspect-ratio: 10/7) 50vw, 71vh"
                    loading="eager"
                    fetchPriority="high"
                    className="object-cover object-center dark:brightness-[0.2] dark:grayscale"
                />
                </picture>
            </div>
        </div>
    )
}

