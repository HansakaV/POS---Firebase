import { useEffect, useState } from 'react';
import { auth, provider, db } from '../config/firebase';
import { signInWithPopup, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, CreditCard, LogIn, LogOut, TrendingUp, BarChart3 } from 'lucide-react';

const Homepage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchDashboardData();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const customersCollection = collection(db, 'customers');
      const ordersCollection = collection(db, 'orders');

      const [customersSnapshot, ordersSnapshot] = await Promise.all([
        getDocs(customersCollection),
        getDocs(ordersCollection),
      ]);

      const customersData = customersSnapshot.docs.map((doc) => doc.data());
      const ordersData = ordersSnapshot.docs.map((doc) => doc.data());

      setTotalCustomers(customersData.length);

      const totalSalesValue = ordersData.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      setTotalSales(totalSalesValue);

      const totalCreditsValue = customersData.reduce((sum, customer) => sum + (customer.Credit || 0), 0);
      setTotalCredits(totalCreditsValue);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const allowedEmails = ["maheshhansaka628@gmail.com"];
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user && user.email && !allowedEmails.includes(user.email)) {
        alert("Access denied!");
        await signOut(auth);
      } else {
        console.log("Welcome, client!");
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {user ? (
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Welcome back, {user.displayName || 'User'}! Here's your business overview.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <LogOut className="mr-2 h-4 w-4" /> 
              Logout
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  Total Customers
                </CardTitle>
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-1">
                  {totalCustomers.toLocaleString()}
                </div>
                <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Active users
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Total Sales
                </CardTitle>
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                  ${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Revenue generated
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  Total Credits
                </CardTitle>
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-1">
                  ${totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center text-xs text-purple-600 dark:text-purple-400">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Available balance
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Content Area */}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-slate-800 dark:text-slate-200">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600">
                  View All Customers
                </Button>
                <Button className="w-full justify-start bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600">
                  Generate Report
                </Button>
                <Button className="w-full justify-start bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600">
                  Manage Orders
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-slate-800 dark:text-slate-200">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-slate-600 dark:text-slate-400 text-sm">
                  <p className="mb-2">• Dashboard loaded successfully</p>
                  <p className="mb-2">• Data synchronized from Firebase</p>
                  <p>• All systems operational</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800/20 bg-[size:60px_60px] opacity-50"></div>
          
          {/* Login Card */}
          <div className="relative z-10 w-full max-w-md">
            <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-800/80 border-slate-200/50 dark:border-slate-700/50 shadow-2xl">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full w-16 h-16 flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Welcome Back
                </CardTitle>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  Access your business dashboard
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Please sign in with your Google account to continue
                  </p>
                  <Button 
                    onClick={signInWithGoogle} 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <LogIn className="mr-2 h-5 w-5" /> 
                    Sign in with Google
                  </Button>
                </div>
                
                <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                  Secure authentication powered by Firebase
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-blue-200 dark:bg-blue-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-32 h-32 bg-purple-200 dark:bg-purple-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
        </div>
      )}
    </div>
  );
};

export default Homepage;