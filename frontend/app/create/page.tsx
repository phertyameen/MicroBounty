'use client'

import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CreateBountyForm } from '@/components/features/CreateBountyForm'
import { useWallet } from '@/context/WalletContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function CreateBountyPage() {
  const { connected } = useWallet()
  const router = useRouter()

  if (!connected) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <Card className="p-12 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto" />
            <h2 className="text-2xl font-bold">Wallet Not Connected</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              You need to connect your wallet to create a bounty. Please go back and connect your wallet first.
            </p>
            <div className="flex gap-2 justify-center pt-4">
              <Link href="/">
                <Button variant="outline">Go Back</Button>
              </Link>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="border-b border-border bg-gradient-to-br from-background via-background to-accent/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-2">Create a New Bounty</h1>
          <p className="text-lg text-muted-foreground">
            Post a task and find talented workers to complete it
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8">
          <CreateBountyForm onSuccess={() => router.push('/')} />
        </Card>

        {/* Help Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Be Specific</h3>
            <p className="text-sm text-muted-foreground">
              Provide clear requirements and acceptance criteria so workers understand exactly what's needed.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Set Fair Budget</h3>
            <p className="text-sm text-muted-foreground">
              Research market rates and set a competitive budget to attract quality submissions.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Quick Review</h3>
            <p className="text-sm text-muted-foreground">
              Review submissions promptly and provide constructive feedback to workers.
            </p>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
