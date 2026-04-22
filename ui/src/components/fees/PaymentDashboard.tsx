import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  Users, 
  CreditCard, 
  AlertCircle 
} from "lucide-react";

export default function PaymentDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  const summaryStats = [
    {
      title: "Total Collection",
      value: "₹45,67,890",
      change: "+12.5%",
      trend: "up",
      icon: IndianRupee,
      color: "text-green-600"
    },
    {
      title: "Pending Payments",
      value: "₹12,34,560",
      change: "-8.2%",
      trend: "down",
      icon: AlertCircle,
      color: "text-orange-600"
    },
    {
      title: "Total Students Paid",
      value: "856",
      change: "+5.3%",
      trend: "up",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Online Transactions",
      value: "642",
      change: "+15.8%",
      trend: "up",
      icon: CreditCard,
      color: "text-purple-600"
    }
  ];

  const monthlyCollectionData = [
    { month: "Apr", collected: 450000, pending: 120000 },
    { month: "May", collected: 520000, pending: 98000 },
    { month: "Jun", collected: 480000, pending: 105000 },
    { month: "Jul", collected: 550000, pending: 89000 },
    { month: "Aug", collected: 490000, pending: 115000 },
    { month: "Sep", collected: 530000, pending: 92000 },
  ];

  const paymentMethodData = [
    { name: "Online/UPI", value: 45, amount: 2050000 },
    { name: "Cash", value: 30, amount: 1370000 },
    { name: "Cheque", value: 20, amount: 913000 },
    { name: "Bank Transfer", value: 5, amount: 228000 }
  ];

  const classWiseCollection = [
    { class: "Class 6", collected: 450000, total: 520000 },
    { class: "Class 7", collected: 480000, total: 540000 },
    { class: "Class 8", collected: 510000, total: 580000 },
    { class: "Class 9", collected: 490000, total: 560000 },
    { class: "Class 10", collected: 520000, total: 600000 }
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payment Analytics Dashboard</h3>
          <p className="text-sm text-muted-foreground">
            Comprehensive overview of fee collection and payment trends
          </p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <div className="flex items-center gap-1">
                      {stat.trend === "up" ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-xs ${stat.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full bg-muted`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Collection Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyCollectionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="collected" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Collected"
                />
                <Line 
                  type="monotone" 
                  dataKey="pending" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Pending"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {paymentMethodData.map((method, index) => (
                <div key={method.name} className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{method.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{method.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class-wise Collection */}
      <Card>
        <CardHeader>
          <CardTitle>Class-wise Collection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classWiseCollection}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="class" />
              <YAxis />
              <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="collected" fill="#10b981" name="Collected" />
              <Bar dataKey="total" fill="#e5e7eb" name="Total Due" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Large Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { student: "Aarav Sharma", class: "Class 10 A", amount: 45000, method: "Online", time: "2 hours ago" },
              { student: "Priya Gupta", class: "Class 9 B", amount: 42000, method: "Cheque", time: "5 hours ago" },
              { student: "Rohan Verma", class: "Class 8 A", amount: 38000, method: "Cash", time: "1 day ago" },
              { student: "Ananya Reddy", class: "Class 10 C", amount: 45000, method: "Bank Transfer", time: "1 day ago" }
            ].map((txn, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{txn.student}</p>
                  <p className="text-sm text-muted-foreground">{txn.class}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">₹{txn.amount.toLocaleString()}</p>
                  <div className="flex items-center gap-2 justify-end">
                    <Badge variant="outline" className="text-xs">{txn.method}</Badge>
                    <span className="text-xs text-muted-foreground">{txn.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
