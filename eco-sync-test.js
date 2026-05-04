// Test Logic for Autogram Eco-Sync Carbon Tracking
const calculateCarbon = (distance, weight) => {
    const factor = 0.5; // จำลองค่า Emission Factor
    return distance * weight * factor;
};

console.log("Testing Bridge System...");
console.log("Result:", calculateCarbon(100, 10));