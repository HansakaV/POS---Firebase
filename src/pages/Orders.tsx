import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Minus, ShoppingCart, Search, Trash2, Loader2, AlertCircle, Mail, ReceiptCent } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import emailjs from '@emailjs/browser';
import BillTemplate from "@/components/BillTemplate";
import { useToast } from "@/hooks/use-toast";
import { db } from "../config/firebase";
import { getDocs, collection, addDoc, updateDoc, doc } from "firebase/firestore";

interface Customer {
  id: string;
  Name: string;
  Phone: number;
  Email: string;
  Credit: number;
  ID: string;
}

interface Item {
  id: string;
  Id: string;
  name: string;
  type: string;
  unitPrice: number;
  Qty: number;
}

interface OrderItem {
  itemId: string;
  itemName: string;
  pricePerUnit: number;
  quantity: number;
}

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: OrderItem[];
  customDescription: string;
  paymentType: "pay_now" | "pay_later";
  totalAmount: number;
  status: "pending" | "completed" | "cancelled";
  createdAt: string;
}

const Orders = () => {
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    customDescription: "",
    paymentType: "pay_now" as "pay_now" | "pay_later"
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const billRef = useRef<HTMLDivElement>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const customersCollection = collection(db, "customers");
  const itemsCollection = collection(db, "items");
  const ordersCollection = collection(db, "orders");

  const getAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch customers, items, and orders in parallel
      const [customersData, itemsData, ordersData] = await Promise.all([
        getDocs(customersCollection),
        getDocs(itemsCollection),
        getDocs(ordersCollection)
      ]);

      const customersList: Customer[] = customersData.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Customer[];

      const itemsList: Item[] = itemsData.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Item[];

      const ordersList: Order[] = ordersData.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      
      setCustomers(customersList);
      setItems(itemsList);
      setOrders(ordersList);
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

  const addOrder = async (orderData: Omit<Order, 'id'>) => {
    try {
      const docRef = await addDoc(ordersCollection, orderData);
      const newOrder: Order = {
        id: docRef.id,
        ...orderData
      };
      setOrders(prev => [...prev, newOrder]);
      return true;
    } catch (error) {
      console.error("Error adding order:", error);
      toast({ 
        title: "Error", 
        description: "Failed to create order.",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateCustomerCredit = async (customerId: string, newCredit: number) => {
    try {
      const customerDoc = doc(db, "customers", customerId);
      await updateDoc(customerDoc, { Credit: newCredit });
      
      setCustomers(prev => prev.map(customer => 
        customer.id === customerId 
          ? { ...customer, Credit: newCredit }
          : customer
      ));
    } catch (error) {
      console.error("Error updating customer credit:", error);
      toast({ 
        title: "Error", 
        description: "Failed to update customer credit.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    getAllData();
  }, []);

  const filteredOrders = orders.filter(order =>
    order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customDescription?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ customerId: "", customDescription: "", paymentType: "pay_now" });
    setOrderItems([]);
  };

  const addItemToOrder = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const existingIndex = orderItems.findIndex(oi => oi.itemId === itemId);
    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += 1;
      setOrderItems(updated);
    } else {
      setOrderItems(prev => [...prev, {
        itemId: item.id,
        itemName: item.name,
        pricePerUnit: item.unitPrice,
        quantity: 1
      }]);
    }
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(prev => prev.filter(item => item.itemId !== itemId));
    } else {
      setOrderItems(prev => prev.map(item => 
        item.itemId === itemId ? { ...item, quantity } : item
      ));
    }
  };

  const getTotalAmount = () => {
    return orderItems.reduce((total, item) => total + (item.pricePerUnit * item.quantity), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId) {
      toast({ title: "Please select a customer", variant: "destructive" });
      return;
    }

    if (orderItems.length === 0) {
      toast({ title: "Please add at least one item", variant: "destructive" });
      return;
    }

    const customer = customers.find(c => c.id === formData.customerId);
    if (!customer) return;

    setSubmitting(true);

    try {
      const totalAmount = getTotalAmount();
      
      const newOrder: Omit<Order, 'id'> = {
        customerId: formData.customerId,
        customerName: customer.Name,
        customerPhone: customer.Phone.toString(),
        customerEmail: customer.Email,
        items: orderItems,
        customDescription: formData.customDescription,
        paymentType: formData.paymentType,
        totalAmount: totalAmount,
        status: "pending",
        createdAt: new Date().toISOString().split('T')[0]
      };

      const success = await addOrder(newOrder);
      
      if (success) {
        // If payment is "pay_later", add amount to customer's credit
        if (formData.paymentType === "pay_later") {
          await updateCustomerCredit(customer.id, customer.Credit + totalAmount);
        }

        toast({ 
          title: "Order created successfully!", 
          description: formData.paymentType === "pay_later" 
            ? "Amount added to customer's credit account" 
            : "Payment received"
        });
        
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error creating order:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateBill = async (order: Order) => {
    setSelectedOrder(order);
    toast({
      title: "Generating Bill",
      description: `Bill for order #${order.id.slice(-6)} is being generated.`,
    });

    setTimeout(async () => {
      if (billRef.current) {
        const canvas = await html2canvas(billRef.current);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        const pdfBlob = pdf.output('blob');

        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = () => {
          const base64data = reader.result;

          const templateParams = {
            to_name: order.customerName, // Optional but nice for greeting
            email: order.customerEmail?.trim(), // Matches {{email}}
            order_id: order.id.slice(-6),       // Matches {{order_id}}
            logo_url: "https://drive.google.com/file/d/1zcEW6cXR7a0dboDUlDg0V4UaYHs66Sg2/view?usp=drive_link", // Matches {{logo_url}}

         // Matches {{#orders}}{{name}}, {{units}}, {{price}}{{/orders}}
            orders: order.items.map(item => ({
            name: item.itemName,
            units: item.quantity,
            price: (item.pricePerUnit * item.quantity).toFixed(2),
        })),

         // Matches {{cost.shipping}}, {{cost.tax}}, {{cost.total}}
        cost: {
           shipping: "0.00", // Adjust if applicable
           tax: (order.totalAmount * 0).toFixed(2), // Example: 8% tax
            total: order.totalAmount.toFixed(2),
              }
          };
          
          emailjs.send('service_sv2ri9x', 'template_gyxi4uj', templateParams, 'TgtuqfE-nCTRfmqQY')
            .then((response) => {
              console.log(response,"badu weda")
              console.log('SUCCESS!', response.status, response.text);
              toast({
                title: "Bill Sent",
                description: `Bill for order #${order.id.slice(-6)} has been sent to ${order.customerEmail}.`,
              });
            }, (err) => {
              console.log('FAILED...', err);
              toast({
                title: "Failed to Send Bill",
                description: `Could not send bill for order #${order.id.slice(-6)}.`,
                variant: "destructive",
              });
            });
        };
        
        pdf.save(`bill-${order.id.slice(-6)}.pdf`);
        setSelectedOrder(null); // Clear the selected order after generating the bill
      }
    }, 500);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "pending": "bg-yellow-100 text-yellow-800",
      "completed": "bg-green-100 text-green-800",
      "cancelled": "bg-red-100 text-red-800"
    };
    return colors[status] || colors["pending"];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading orders...</span>
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
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Orders</h1>
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
                onClick={getAllData}
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
          <ShoppingCart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <Select 
                    value={formData.customerId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value }))}
                    required
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.Name} - {customer.Phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment">Payment Type</Label>
                  <Select 
                    value={formData.paymentType} 
                    onValueChange={(value: "pay_now" | "pay_later") => setFormData(prev => ({ ...prev, paymentType: value }))}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pay_now">Pay Now</SelectItem>
                      <SelectItem value="pay_later">Pay Later</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Custom Description</Label>
                <Textarea
                  id="description"
                  value={formData.customDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, customDescription: e.target.value }))}
                  placeholder="e.g., 200 A4 prints double side"
                  rows={2}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Select onValueChange={addItemToOrder} disabled={submitting}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Add item to order" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.filter(item => item.Qty > 0).map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} - ${item.unitPrice?.toFixed(2)} (Stock: {item.Qty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {orderItems.length > 0 && (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((orderItem) => (
                          <TableRow key={orderItem.itemId}>
                            <TableCell>{orderItem.itemName}</TableCell>
                            <TableCell>${orderItem.pricePerUnit.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateItemQuantity(orderItem.itemId, orderItem.quantity - 1)}
                                  disabled={submitting}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center">{orderItem.quantity}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateItemQuantity(orderItem.itemId, orderItem.quantity + 1)}
                                  disabled={submitting}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>${(orderItem.pricePerUnit * orderItem.quantity).toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateItemQuantity(orderItem.itemId, 0)}
                                className="text-destructive hover:text-destructive"
                                disabled={submitting}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} className="font-medium">Total Amount:</TableCell>
                          <TableCell className="font-bold">${getTotalAmount().toFixed(2)}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Order
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
            <CardTitle>Order History ({filteredOrders.length})</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search orders..."
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
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono">#{order.id.slice(-6)}</TableCell>
                    <TableCell className="font-medium">
                      <div>{order.customerName}</div>
                      <div className="text-sm text-muted-foreground">{order.customerPhone}</div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{order.customDescription}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.items?.map((item, index) => (
                          <div key={index}>
                            {item.itemName} × {item.quantity}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.paymentType === "pay_now" ? "default" : "secondary"}>
                        {order.paymentType === "pay_now" ? "Paid" : "Pay Later"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">${order.totalAmount?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)} variant="secondary">
                        {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.createdAt}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="icon" onClick={() => handleGenerateBill(order)}>
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No orders found matching your search." : "No orders yet. Create your first order!"}
            </div>
          )}
        </CardContent>
      </Card>
      <div style={{ position: 'absolute', left: '-9999px' }}>
        {selectedOrder && <div ref={billRef}><BillTemplate order={selectedOrder} /></div>}
      </div>
    </div>
  );
};

export default Orders;