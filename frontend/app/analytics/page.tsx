'use client'

import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Users, DollarSign, Zap } from 'lucide-react'

const trendData = [
  { date: 'Jan 1', bounties: 120, submissions: 340, value: 45000 },
  { date: 'Jan 8', bounties: 145, submissions: 380, value: 52000 },
  { date: 'Jan 15', bounties: 168, submissions: 420, value: 58000 },
  { date: 'Jan 22', bounties: 195, submissions: 480, value: 68000 },
  { date: 'Jan 29', bounties: 220, submissions: 510, value: 75000 },
  { date: 'Feb 5', bounties: 260, submissions: 580, value: 85000 },
  { date: 'Feb 12', bounties: 310, submissions: 640, value: 98000 },
]

const categoryData = [
  { name: 'Development', value: 120, percentage: 35 },
  { name: 'Design', value: 80, percentage: 24 },
  { name: 'Testing', value: 50, percentage: 15 },
  { name: 'Documentation', value: 40, percentage: 12 },
  { name: 'Other', value: 40, percentage: 14 },
]

const topCreators = [
  { rank: 1, name: 'Alice Developer', bounties: 24, totalSpent: '145,000', avgValue: '6,042' },
  { rank: 2, name: 'Bob Innovator', bounties: 18, totalSpent: '98,500', avgValue: '5,472' },
  { rank: 3, name: 'Charlie Dev', bounties: 15, totalSpent: '72,300', avgValue: '4,820' },
  { rank: 4, name: 'Diana Code', bounties: 12, totalSpent: '61,200', avgValue: '5,100' },
  { rank: 5, name: 'Eve Builder', bounties: 10, totalSpent: '48,900', avgValue: '4,890' },
]

const topWorkers = [
  { rank: 1, name: 'John Expert', submissions: 34, acceptanceRate: 88, totalEarned: '125,400', avgEarning: '3,688' },
  { rank: 2, name: 'Jane Coder', submissions: 28, acceptanceRate: 82, totalEarned: '98,700', avgEarning: '3,525' },
  { rank: 3, name: 'Mike Designer', submissions: 22, acceptanceRate: 86, totalEarned: '76,200', avgEarning: '3,463' },
  { rank: 4, name: 'Sarah Dev', submissions: 18, acceptanceRate: 78, totalEarned: '58,900', avgEarning: '3,272' },
  { rank: 5, name: 'Tom Tester', submissions: 15, acceptanceRate: 80, totalEarned: '45,600', avgEarning: '3,040' },
]

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="border-b border-border bg-gradient-to-br from-background via-background to-accent/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-2">Platform Analytics</h1>
          <p className="text-lg text-muted-foreground">
            Real-time insights into the MicroBounty ecosystem
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Bounties</p>
                <p className="text-3xl font-bold">1,240</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +12% this month
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Value</p>
                <p className="text-3xl font-bold">$2.3M</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +18% this month
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Creators</p>
                <p className="text-3xl font-bold">2,890</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +8% this month
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Submissions</p>
                <p className="text-3xl font-bold">5,280</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +24% this month
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Platform Growth */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="font-semibold mb-6">Platform Growth (7 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs text-muted-foreground" />
                <YAxis className="text-xs text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="bounties"
                  stroke="#3b82f6"
                  name="Bounties"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  stroke="#8b5cf6"
                  name="Submissions"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Category Distribution */}
          <Card className="p-6">
            <h2 className="font-semibold mb-6">Bounties by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Value Trend */}
        <Card className="p-6 mb-8">
          <h2 className="font-semibold mb-6">Platform Value Growth</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs text-muted-foreground" />
              <YAxis className="text-xs text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill="#10b981" name="Platform Value ($)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Creators & Workers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Creators */}
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Top Creators</h2>
            <div className="space-y-3">
              {topCreators.map((creator) => (
                <div key={creator.rank} className="flex items-center justify-between pb-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {creator.rank}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{creator.name}</p>
                      <p className="text-xs text-muted-foreground">{creator.bounties} bounties</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">${creator.totalSpent}</p>
                    <p className="text-xs text-muted-foreground">avg ${creator.avgValue}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Workers */}
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Top Workers</h2>
            <div className="space-y-3">
              {topWorkers.map((worker) => (
                <div key={worker.rank} className="flex items-center justify-between pb-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {worker.rank}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{worker.name}</p>
                      <p className="text-xs text-muted-foreground">{worker.submissions} submissions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1">{worker.acceptanceRate}% acceptance</Badge>
                    <p className="text-xs font-semibold">${worker.totalEarned}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
