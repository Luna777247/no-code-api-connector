import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home } from "lucide-react"

export function BackToHomeButton({ className }) {
  return (
    <Link href="/">
      <Button variant="ghost" className={`gap-2 ${className || ""}`}>
        <ArrowLeft className="h-4 w-4" />
        <Home className="h-4 w-4" />
        Back to Home
      </Button>
    </Link>
  )
}
