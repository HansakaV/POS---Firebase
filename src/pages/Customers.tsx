import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Search, Users, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "../config/firebase";
import { getDocs, collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

interface Customer {
  id: string;
  Name: string;
  Phone: number;
  Email: string;
  Credit: number;
  ID: string;
  createdAt?: string;
}

const Customers = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    Name: "",
    Phone: "",
    Email: "",
    Credit: 0,
    ID: ""
  });

  const customersCollection = collection(db, "customers");

  const getAllCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDocs(customersCollection);
      console.log("Fetched customers from Firebase:", data);
      
      const customersList: Customer[] = data.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Customer[];
      
      setCustomers(customersList);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setError("Failed to load customers. Please try again.");
      toast({ 
        title: "Error", 
        description: "Failed to load customers from database.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id'>) => {
    try {
      const docRef = await addDoc(customersCollection, customerData);
      const newCustomer: Customer = {
        id: docRef.id,
        ...customerData
      };
      setCustomers(prev => [...prev, newCustomer]);
      return true;
    } catch (error) {
      console.error("Error adding customer:", error);
      toast({ 
        title: "Error", 
        description: "Failed to add customer.",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateCustomer = async (customerId: string, customerData: Partial<Customer>) => {
    try {
      const customerDoc = doc(db, "customers", customerId);
      await updateDoc(customerDoc, customerData);
      setCustomers(prev => prev.map(customer => 
        customer.id === customerId 
          ? { ...customer, ...customerData }
          : customer
      ));
      return true;
    } catch (error) {
      console.error("Error updating customer:", error);
      toast({ 
        title: "Error", 
        description: "Failed to update customer.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteCustomer = async (customerId: string) => {
    try {
      const customerDoc = doc(db, "customers", customerId);
      await deleteDoc(customerDoc);
      setCustomers(prev => prev.filter(customer => customer.id !== customerId));
      toast({ title: "Customer deleted successfully!" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({ 
        title: "Error", 
        description: "Failed to delete customer.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    getAllCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.Phone?.toString().includes(searchTerm) ||
    customer.Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.ID?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ Name: "", Phone: "", Email: "", Credit: 0, ID: "" });
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (editingCustomer) {
        const success = await updateCustomer(editingCustomer.id, {
          Name: formData.Name,
          Phone: parseInt(formData.Phone) || 0,
          Email: formData.Email,
          Credit: formData.Credit,
          ID: formData.ID
        });
        if (success) {
          toast({ title: "Customer updated successfully!" });
          setIsDialogOpen(false);
          resetForm();
        }
      } else {
        const newCustomerData = {
          Name: formData.Name,
          Phone: parseInt(formData.Phone) || 0,
          Email: formData.Email,
          Credit: formData.Credit,
          ID: formData.ID,
          createdAt: new Date().toISOString().split('T')[0]
        };
        const success = await addCustomer(newCustomerData);
        if (success) {
          toast({ title: "Customer added successfully!" });
          setIsDialogOpen(false);
          resetForm();
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      Name: customer.Name || "",
      Phone: customer.Phone?.toString() || "",
      Email: customer.Email || "",
      Credit: customer.Credit || 0,
      ID: customer.ID || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      await deleteCustomer(id);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading customers...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={getAllCustomers}
                className="ml-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="id">Customer ID</Label>
                <Input
                  id="id"
                  value={formData.ID}
                  onChange={(e) => setFormData(prev => ({ ...prev, ID: e.target.value }))}
                  placeholder="C001"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.Name}
                  onChange={(e) => setFormData(prev => ({ ...prev, Name: e.target.value }))}
                  placeholder="Customer name"
                  required
                  disabled={submitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="number"
                  value={formData.Phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, Phone: e.target.value }))}
                  placeholder="710356244"
                  required
                  disabled={submitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.Email}
                  onChange={(e) => setFormData(prev => ({ ...prev, Email: e.target.value }))}
                  placeholder="customer@example.com"
                  required
                  disabled={submitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="credit">Credit ($)</Label>
                <Input
                  id="credit"
                  type="number"
                  step="0.01"
                  value={formData.Credit}
                  onChange={(e) => setFormData(prev => ({ ...prev, Credit: parseFloat(e.target.value) || 0 }))}
                  placeholder="1000"
                  disabled={submitting}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCustomer ? "Update" : "Add"} Customer
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Customer List ({filteredCustomers.length})</CardTitle>
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
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-mono text-sm">{customer.ID}</TableCell>
                    <TableCell className="font-medium">{customer.Name}</TableCell>
                    <TableCell>{customer.Phone}</TableCell>
                    <TableCell>{customer.Email}</TableCell>
                    <TableCell>
                      {customer.Credit > 0 ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          ${customer.Credit?.toFixed(2) || '0.00'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          $0.00
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{customer.createdAt || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(customer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(customer.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredCustomers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No customers found matching your search." : "No customers yet. Add your first customer!"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;