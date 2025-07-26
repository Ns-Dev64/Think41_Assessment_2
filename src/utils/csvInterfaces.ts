export interface DistributionCenter {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export interface InventoryItem {
  id: number;
  product_id: number;
  created_at: Date;
  sold_at?: Date;
  cost: number;
  product_category: string;
  product_name: string;
  product_brand: string;
  product_retail_price: number;
  product_department: string;
  product_sku: string;
  product_distribution_center_id: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  user_id: number;
  product_id: number;
  inventory_item_id: number;
  status: string;
  created_at: Date;
  shipped_at?: Date;
  delivered_at?: Date;
  returned_at?: Date;
}

 export interface Order {
  order_id: number;
  user_id: number;
  status: string;
  gender: string;
  created_at: Date;
  returned_at?: Date;
  shipped_at?: Date;
  delivered_at?: Date;
  num_of_item: number;
}

export interface Product {
  id: number;
  cost: number;
  category: string;
  name: string;
  brand: string;
  retail_price: number;
  department: string;
  sku: string;
  distribution_center_id: number;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  age: number;
  gender: string;
  state: string;
  street_address: string;
  postal_code: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  traffic_source: string;
  created_at: Date;
}
