export const STATUS_STYLE = {
  available: { bg: "#EAF0E3", fg: "#3F5C2C", label: "Available" },
  claimed: { bg: "#FBEAD8", fg: "#8A4A15", label: "Claimed" },
  delivered: { bg: "#EAF0E3", fg: "#3F5C2C", label: "Delivered" },
  "in transit": { bg: "#F5E8CE", fg: "#8A6A0F", label: "In transit" },
  pending: { bg: "#F5E8CE", fg: "#8A6A0F", label: "Pending" },
  assigned: { bg: "#E6EEF3", fg: "#1F5A7A", label: "Assigned" },
  unassigned: { bg: "#F2EEE1", fg: "#6B6656", label: "Unassigned" },
  urgent: { bg: "#F8E1DC", fg: "#9A3A24", label: "Urgent" },
};

export const WEEK = [
  { day: "Wed", prepared: 108, sold: 89 },
  { day: "Thu", prepared: 112, sold: 94 },
  { day: "Fri", prepared: 130, sold: 118 },
  { day: "Sat", prepared: 140, sold: 131 },
  { day: "Sun", prepared: 96, sold: 81 },
  { day: "Mon", prepared: 90, sold: 74 },
  { day: "Tue", prepared: 100, sold: 83 },
];

export const RESTAURANT_TICKETS = [
  { id: "t1", item: "Steamed rice", qty: 18, unit: "servings", expires: "9:30 PM", status: "available" },
  { id: "t2", item: "Vegetable curry", qty: 9, unit: "servings", expires: "9:00 PM", status: "available" },
  { id: "t3", item: "Tandoori bread", qty: 24, unit: "pieces", expires: "8:45 PM", status: "claimed" },
];

export const RESTAURANT_HISTORY = [
  { id: "d1", item: "Rice + dal, 22 servings", ngo: "Ummeed Food Bank", date: "Aug 21", status: "delivered" },
  { id: "d2", item: "Mixed sabzi, 14 servings", ngo: "Roshni Trust", date: "Aug 20", status: "delivered" },
  { id: "d3", item: "Bread, 30 pieces", ngo: "Apna Ghar NGO", date: "Aug 19", status: "in transit" },
];

export const NGO_AVAILABLE_DONATIONS = [
  { id: "n1", restaurant: "Spice Route Kitchen", item: "Steamed rice", qty: 18, distance: "2.3 km", score: 91, expires: "9:30 PM" },
  { id: "n2", restaurant: "Green Leaf Cafe", item: "Vegetable pulao", qty: 12, distance: "3.1 km", score: 84, expires: "9:15 PM" },
  { id: "n3", restaurant: "Coastal Kitchen", item: "Fish curry + rice", qty: 20, distance: "4.6 km", score: 76, expires: "8:50 PM" },
];

export const NGO_REQUESTS = [
  { id: "r1", food: "Cooked rice or grains", qty: 40, urgency: "urgent", status: "pending" },
  { id: "r2", food: "Vegetable curry", qty: 25, urgency: "normal", status: "pending" },
];

export const NGO_DELIVERIES = [
  { id: "nd1", item: "Rice + dal, 22 servings", volunteer: "Aman Verma", eta: "15 min", status: "in transit" },
  { id: "nd2", item: "Mixed sabzi, 14 servings", volunteer: "Priya Nair", eta: "Delivered 6:40 PM", status: "delivered" },
];

export const VOLUNTEER_ASSIGNED = {
  id: "p1",
  from: "Spice Route Kitchen",
  to: "Ummeed Food Bank",
  distance: "2.3 km",
  window: "8:30 PM – 9:00 PM",
  meals: 18,
};

export const VOLUNTEER_AVAILABLE = [
  { id: "v1", from: "Green Leaf Cafe", to: "Roshni Trust", distance: "3.1 km", window: "8:15 PM – 8:45 PM", meals: 12 },
  { id: "v2", from: "Coastal Kitchen", to: "Apna Ghar NGO", distance: "4.6 km", window: "8:00 PM – 8:40 PM", meals: 20 },
];

export const VOLUNTEER_HISTORY = [
  { id: "vh1", route: "Spice Route Kitchen → Roshni Trust", date: "Aug 21", meals: 22, status: "delivered" },
  { id: "vh2", route: "Green Leaf Cafe → Apna Ghar NGO", date: "Aug 20", meals: 14, status: "delivered" },
];

export const IMPACT_METRICS = [
  { label: "Meals redistributed", value: "12,480" },
  { label: "Food waste reduced", value: "3,240 kg" },
  { label: "Active restaurants", value: "38" },
  { label: "NGO partners", value: "12" },
  { label: "Deliveries completed", value: "426" },
];

export const IMPACT_TREND = [
  { month: "Mar", meals: 6200 },
  { month: "Apr", meals: 7400 },
  { month: "May", meals: 8100 },
  { month: "Jun", meals: 9600 },
  { month: "Jul", meals: 11100 },
  { month: "Aug", meals: 12480 },
];

export const MODEL_COMPARISON = [
  { model: "Linear Regression", mae: 11.2 },
  { model: "Random Forest", mae: 7.8 },
  { model: "XGBoost", mae: 6.4 },
];

export const ADMIN_RESTAURANTS = [
  { id: "ar1", name: "Spice Route Kitchen", donations: 46, meals: 1180 },
  { id: "ar2", name: "Green Leaf Cafe", donations: 31, meals: 740 },
  { id: "ar3", name: "Coastal Kitchen", donations: 24, meals: 690 },
];

export const ADMIN_NGOS = [
  { id: "an1", name: "Ummeed Food Bank", requests: 52, fulfilled: 49 },
  { id: "an2", name: "Roshni Trust", requests: 37, fulfilled: 35 },
  { id: "an3", name: "Apna Ghar NGO", requests: 28, fulfilled: 24 },
];
