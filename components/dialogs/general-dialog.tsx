import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type Props = {
    open?: boolean
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>
    trigger?: boolean
    triggerCaption?: string
    title: string
    description?: string
    children?: React.ReactNode
    close?: boolean
}
 
export default function GeneralDialog(props: Props) 
{
    const { 
        open, 
        close = false,  
        setOpen, trigger, 
        triggerCaption, 
        title, 
        description, 
        children} = props;
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {
                trigger && (
                    <DialogTrigger render={<Button type="button" variant="outline" />}>
                        {triggerCaption}
                    </DialogTrigger>
                )
            }
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                {children}
                <DialogFooter className="sm:justify-start">
                    { close && (
                    <DialogClose render={<Button type="button" variant="secondary" />}>
                        Close
                    </DialogClose>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
