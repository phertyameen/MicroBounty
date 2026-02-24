import { Zap } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold">
              <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                <Zap className="w-4 h-4" />
              </div>
              <span>MicroBounty</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Decentralized marketplace for bounties on Polkadot Hub
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/" className="hover:text-foreground transition-colors">Browse Bounties</a></li>
              <li><a href="/create" className="hover:text-foreground transition-colors">Create Bounty</a></li>
              <li><a href="/analytics" className="hover:text-foreground transition-colors">Analytics</a></li>
            </ul>
          </div>

          {/* Network Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Network</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Polkadot Hub</li>
              <li><a href="#" className="hover:text-foreground transition-colors">View Contracts</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>&copy; {currentYear} MicroBounty. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
