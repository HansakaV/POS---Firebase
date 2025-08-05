import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Search, Package, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "../config/firebase";
import { getDocs, collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

interface Item {
  id: string;
  Id: string;
  name: string;
  type: string;
  unitPrice: number;
  Qty: number;
  createdAt?: string;
}

const ITEM_TYPES = ["printing", "stationery", "binding", "lamination", "other"];

const Items = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    Id: "",
    name: "",
    type: "",
    unitPrice: 0,
    Qty: 0
  });

  const itemsCollection = collection(db, "items");

  const getAllItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDocs(itemsCollection);
      console.log("Fetched items from Firebase:", data);
      
      const itemsList: Item[] = data.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Item[];
      
      setItems(itemsList);
    } catch (error) {
      console.error("Error fetching items:", error);
      setError("Failed to load items. Please try again.");
      toast({ 
        title: "Error", 
        description: "Failed to load items from database.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (itemData: Omit<Item, 'id'>) => {
    try {
      const docRef = await addDoc(itemsCollection, itemData);
      const newItem: Item = {
        id: docRef.id,
        ...itemData
      };
      setItems(prev => [...prev, newItem]);
      return true;
    } catch (error) {
      console.error("Error adding item:", error);
      toast({ 
        title: "Error", 
        description: "Failed to add item.",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateItem = async (itemId: string, itemData: Partial<Item>) => {
    try {
      const itemDoc = doc(db, "items", itemId);
      await updateDoc(itemDoc, itemData);
      setItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, ...itemData }
          : item
      ));
      return true;
    } catch (error) {
      console.error("Error updating item:", error);
      toast({ 
        title: "Error", 
        description: "Failed to update item.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const itemDoc = doc(db, "items", itemId);
      await deleteDoc(itemDoc);
      setItems(prev => prev.filter(item => item.id !== itemId));
      toast({ title: "Item deleted successfully!" });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({ 
        title: "Error", 
        description: "Failed to delete item.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    getAllItems();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.Id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const resetForm = () => {
    setFormData({ Id: "", name: "", type: "", unitPrice: 0, Qty: 0 });
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (editingItem) {
        const success = await updateItem(editingItem.id, {
          Id: formData.Id,
          name: formData.name,
          type: formData.type,
          unitPrice: formData.unitPrice,
          Qty: formData.Qty
        });
        if (success) {
          toast({ title: "Item updated successfully!" });
          setIsDialogOpen(false);
          resetForm();
        }
      } else {
        const newItemData = {
          Id: formData.Id,
          name: formData.name,
          type: formData.type,
          unitPrice: formData.unitPrice,
          Qty: formData.Qty,
          createdAt: new Date().toISOString().split('T')[0]
        };
        const success = await addItem(newItemData);
        if (success) {
          toast({ title: "Item added successfully!" });
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

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      Id: item.Id || "",
      name: item.name || "",
      type: item.type || "",
      unitPrice: item.unitPrice || 0,
      Qty: item.Qty || 0
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      await deleteItem(id);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      "printing": "bg-blue-100 text-blue-800",
      "stationery": "bg-green-100 text-green-800", 
      "binding": "bg-purple-100 text-purple-800",
      "lamination": "bg-orange-100 text-orange-800",
      "other": "bg-gray-100 text-gray-800"
    };
    return colors[type?.toLowerCase()] || colors["other"];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Items</h1>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading items...</span>
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
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Items</h1>
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
                onClick={getAllItems}
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
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Items</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Item" : "Add New Item"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="id">Item ID</Label>
                <Input
                  id="id"
                  value={formData.Id}
                  onChange={(e) => setFormData(prev => ({ ...prev, Id: e.target.value }))}
                  placeholder="I001"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., A4 Sheets"
                  required
                  disabled={submitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  required
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit Price ($)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qty">Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  min="0"
                  value={formData.Qty}
                  onChange={(e) => setFormData(prev => ({ ...prev, Qty: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  required
                  disabled={submitting}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingItem ? "Update" : "Add"} Item
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
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Item Catalog ({filteredItems.length})</CardTitle>
            <div className="flex gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ITEM_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.Id}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(item.type)} variant="secondary">
                        {item.type?.charAt(0).toUpperCase() + item.type?.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      ${item.unitPrice?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      {item.Qty > 0 ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          {item.Qty}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-100 text-red-800">
                          Out of Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{item.createdAt || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
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
          
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || filterType !== "all" ? "No items found matching your filters." : "No items yet. Add your first item!"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Items;