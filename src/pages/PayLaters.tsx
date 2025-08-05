import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Search, History, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "../config/firebase";
import { getDocs, collection, addDoc, updateDoc, doc, query, where } from "firebase/firestore";
import emailjs from '@emailjs/browser';

interface Customer {
  id: string;
  Name: string;
  Phone: number;
  Credit: number;
  Email: string;
}

interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  date: string;
  note: string;
}


const PayLaters = () => {
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNote, setPaymentNote] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const customersCollection = collection(db, "customers");
  const paymentsCollection = collection(db, "payments");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch customers with outstanding credit
      const q = query(customersCollection, where("Credit", ">", 0));
      const customersSnapshot = await getDocs(q);
      const customersList: Customer[] = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      setCustomers(customersList);

      // Fetch all payments
      const paymentsSnapshot = await getDocs(paymentsCollection);
      const paymentsList: Payment[] = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];
      setPayments(paymentsList);

    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data. Please try again.");
      toast({ 
        title: "Error", 
        description: "Failed to load data from database.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.Phone.toString().includes(searchTerm)
  );

  const totalOutstanding = customers.reduce((total, customer) => total + customer.Credit, 0);

  const openPaymentDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount(customer.Credit); // Default to full payment
    setPaymentNote("");
    setIsDialogOpen(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer || paymentAmount <= 0) {
      toast({ title: "Invalid payment amount", variant: "destructive" });
      return;
    }

    if (paymentAmount > selectedCustomer.Credit) {
      toast({ title: "Payment amount cannot exceed outstanding credit", variant: "destructive" });
      return;
    }

    const customerDocRef = doc(db, "customers", selectedCustomer.id);

    try {
      // Create payment record
      const newPaymentData: Omit<Payment, 'id'> = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.Name,
        amount: paymentAmount,
        previousBalance: selectedCustomer.Credit,
        newBalance: selectedCustomer.Credit - paymentAmount,
        date: new Date().toISOString().split('T')[0],
        note: paymentNote
      };
      
      const docRef = await addDoc(paymentsCollection, newPaymentData);
      const newPayment = { id: docRef.id, ...newPaymentData };
      setPayments(prev => [newPayment, ...prev]);

      // Update customer's outstanding credit
      const newCredit = selectedCustomer.Credit - paymentAmount;
      await updateDoc(customerDocRef, { Credit: newCredit });
      
      // Update local customer state
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, Credit: newCredit } : c).filter(c => c.Credit > 0));

      toast({
        title: "Payment recorded successfully!",
        description: `$${paymentAmount.toFixed(2)} received from ${selectedCustomer.Name}`
      });

      // Send Email notification
      if (selectedCustomer.Email) {
        const templateParams = {
          name: selectedCustomer.Name,
          email: selectedCustomer.Email,
          from_name: 'DP Communication',
          title: paymentAmount.toFixed(2),
          balance: newCredit.toFixed(2),
          payment_date: new Date().toLocaleDateString(),
        };

        emailjs.send('service_sv2ri9x', 'template_eu9isjs', templateParams, 'TgtuqfE-nCTRfmqQY')
          .then((response) => {
            console.log('SUCCESS!', response.status, response.text);
            toast({
              title: "Email Sent",
              description: `Payment confirmation sent to ${selectedCustomer.Email}.`,
            });
          }, (err) => {
            console.log('FAILED...', err);
            toast({
              title: "Failed to Send Email",
              description: `Could not send email confirmation.`,
              variant: "destructive",
            });
          });
      }

      
      setIsDialogOpen(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({ title: "Error processing payment", variant: "destructive" });
    }
  };

  const getCustomerPaymentHistory = (customerId: string) => {
    return payments.filter(payment => payment.customerId === customerId)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Pay Later data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-destructive/10 border border-destructive rounded-lg">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <span className="mt-4 text-lg text-destructive">{error}</span>
        <Button variant="outline" onClick={fetchData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <DollarSign className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Pay Later Accounts</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowHistory(!showHistory)}
            className="shadow-sm"
          >
            <History className="mr-2 h-4 w-4" />
            {showHistory ? "Hide" : "Show"} History
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">LKR {totalOutstanding.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customers with Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">All Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{payments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Credits Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Outstanding Credits</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Outstanding Amount</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => {
                  const lastPayment = getCustomerPaymentHistory(customer.id)[0];
                  return (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.Name}</TableCell>
                      <TableCell>{customer.Phone}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="font-mono">
                          LKR {customer.Credit.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lastPayment ? (
                          <div className="text-sm text-muted-foreground">
                            LKR {lastPayment.amount.toFixed(2)} on {lastPayment.date}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No payments yet</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openPaymentDialog(customer)}
                          className="shadow-sm"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Record Payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {filteredCustomers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No customers found matching your search." : "Great! No outstanding credits."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Full Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Previous Balance</TableHead>
                    <TableHead>New Balance</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell className="font-medium">{payment.customerName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-green-700 font-mono border-green-200 bg-green-50">
                          +LKR {payment.amount.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">LKR {payment.previousBalance.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">LKR {payment.newBalance.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {payments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No payment history recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="font-medium">{selectedCustomer.Name}</div>
                  <div className="text-sm text-muted-foreground">{selectedCustomer.Phone}</div>
                  <div className="text-sm">
                    Outstanding: <span className="font-mono text-destructive">LKR {selectedCustomer.Credit.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount (LKR)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedCustomer.Credit}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  required
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentAmount(selectedCustomer.Credit)}
                  >
                    Full Payment
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentAmount(Math.round(selectedCustomer.Credit / 2 * 100) / 100)}
                  >
                    Half Payment
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="note">Note (Optional)</Label>
                <Input
                  id="note"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g., Cash payment, partial payment"
                />
              </div>

              {paymentAmount > 0 && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm">
                    <div>Amount to receive: <span className="font-mono font-medium">LKR {paymentAmount.toFixed(2)}</span></div>
                    <div>Remaining balance: <span className="font-mono font-medium">LKR {(selectedCustomer.Credit - paymentAmount).toFixed(2)}</span></div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Record Payment
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayLaters;