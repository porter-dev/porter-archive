export const overrideObjectValues = (obj1: any, obj2: any) => {
    // Iterate over the keys in obj2
    for (const key in obj2) {
        // Check if the key exists in obj1 and if its value is an object
        if (key in obj1 && typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
            // Recursively call the function to handle the nested object
            obj1[key] = overrideObjectValues(obj1[key], obj2[key]);
        } else {
            // Otherwise, just assign the value from obj2 to obj1
            obj1[key] = obj2[key];
        }
    }

    // Return the merged object
    return obj1;
};
