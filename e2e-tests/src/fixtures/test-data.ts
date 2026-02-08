export interface CustomerData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
}

export interface PaymentMethod {
    id: string;
    name: string;
}

export const TEST_CUSTOMER: CustomerData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '1234567890',
    address: '123 Test Street',
    city: 'Test City',
    state: 'CA',
    postcode: '90001',
    country: 'US',
};

export const PAYMENT_METHODS = {
    COD: {
        id: 'cod',
        name: 'Cash on Delivery',
    },
    BANK_TRANSFER: {
        id: 'bacs',
        name: 'Direct Bank Transfer',
    },
    CHECK: {
        id: 'cheque',
        name: 'Check Payment',
    },
};

export function generateCustomerData(): CustomerData {
    const randomNum = Math.floor(Math.random() * 10000);
    return {
        firstName: `Test${randomNum}`,
        lastName: `User${randomNum}`,
        email: `test${randomNum}@example.com`,
        phone: `555${randomNum.toString().padStart(7, '0')}`,
        address: `${randomNum} Test Avenue`,
        city: 'Test City',
        state: 'CA',
        postcode: '90001',
        country: 'US',
    };
}

export const TEST_PRODUCTS = {
    ANY_AVAILABLE: 'first-available',
    SAMPLE_PRODUCT: 'sample-product',
};
