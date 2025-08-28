require('dotenv').config();
import axios, { AxiosResponse } from 'axios';
import integrationsModel from '../models/integrations.models';
import CryptoUtils from './crypto.utils';
import { BadRequestException } from '../exceptions/HttpExceptions';

interface BillzAuthResponse {
    data?: {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
    };
}

interface BillzLoginPayload {
    secret_token: string;
}

class BillzAuthService {
    private static instance: BillzAuthService;
    private readonly baseUrl = 'https://api-admin.billz.ai/v1';
    private readonly integrationType = 'billz';

    private constructor() { }

    public static getInstance(): BillzAuthService {
        if (!BillzAuthService.instance) {
            BillzAuthService.instance = new BillzAuthService();
        }
        return BillzAuthService.instance;
    }

    /**
     * Login to Billz API and save tokens
     */
    public async login(): Promise<void> {
        try {
            // Get Billz integration configuration
            const billzIntegration: any = await integrationsModel.findOne({
                type: this.integrationType,
                isActive: true
            });

            if (!billzIntegration) {
                throw new BadRequestException('Billz integration not found or not active');
            }

            if (!billzIntegration.token) {
                throw new BadRequestException('Billz secret token not configured');
            }

            // decrypt token
            const decryptedToken = CryptoUtils.decrypt(JSON.parse(billzIntegration.token));

            // Prepare login payload
            const payload: BillzLoginPayload = {
                secret_token: decryptedToken
            };

            // Make login request
            const response: AxiosResponse<BillzAuthResponse> = await axios.post(
                `${this.baseUrl}/auth/login`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 10000 // 10 second timeout
                }
            );

            const { access_token, refresh_token } = response.data?.data || {};

            if (!access_token) {
                throw new BadRequestException('No access token received from Billz API');
            }

            // Calculate expiration date (15 days from now)
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 15);

            // Encrypt tokens before saving
            const encryptedAccessToken = CryptoUtils.encrypt(access_token);
            const encryptedRefreshToken = refresh_token ? CryptoUtils.encrypt(refresh_token) : null;

            // Update integration with encrypted tokens
            await integrationsModel.findByIdAndUpdate(
                billzIntegration._id,
                {
                    access_token: JSON.stringify(encryptedAccessToken),
                    refresh_token: encryptedRefreshToken ? JSON.stringify(encryptedRefreshToken) : null,
                    expire_date: expirationDate,
                    isActive: true
                },
                { new: true }
            );

        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                throw new BadRequestException(error.response?.data || error.message || 'Unknown error');
            }
            throw new BadRequestException(error.message || 'Unknown error');
        }
    }

    /**
     * Get current valid access token
     */
    public async getAccessToken(): Promise<string | null> {
        try {
            const billzIntegration: any = await integrationsModel.findOne({
                type: this.integrationType,
                isActive: true
            });

            // if isActive is false, throw error
            if (!billzIntegration.isActive) {
                throw new BadRequestException('Billz integration is not active');
            }

            if (!billzIntegration || !billzIntegration.access_token) {
                console.log('No Billz access token found. Attempting to login...');
                await this.login();

                // Retry getting token after login
                const updatedIntegration = await integrationsModel.findOne({
                    type: this.integrationType,
                    isActive: true
                });

                if (updatedIntegration?.access_token) {
                    try {
                        const encryptedData = JSON.parse(updatedIntegration.access_token);
                        return CryptoUtils.decrypt(encryptedData);
                    } catch (error) {
                        console.error('Error decrypting access token:', error);
                        return null;
                    }
                }
                return null;
            }

            // Check if token is expired
            const oneDayBefore = new Date(billzIntegration.expire_date);
            oneDayBefore.setDate(oneDayBefore.getDate() - 1);
            if (billzIntegration.expire_date && oneDayBefore <= new Date()) {
                console.log('Billz access token expired. Refreshing...');
                await this.login();

                // Retry getting token after refresh
                const updatedIntegration = await integrationsModel.findOne({
                    type: this.integrationType,
                    isActive: true
                });

                if (updatedIntegration?.access_token) {
                    try {
                        const encryptedData = JSON.parse(updatedIntegration.access_token);
                        return CryptoUtils.decrypt(encryptedData);
                    } catch (error) {
                        console.error('Error decrypting access token:', error);
                        return null;
                    }
                }
                return null;
            }

            // Decrypt the stored access token
            try {
                const encryptedData = JSON.parse(billzIntegration.access_token);
                return CryptoUtils.decrypt(encryptedData);
            } catch (error) {
                console.error('Error decrypting stored access token:', error);
                return null;
            }
        } catch (error) {
            console.error('Error getting Billz access token:', error);
            return null;
        }
    }

    /**
     * Get authenticated headers for Billz API requests
     */
    public async getAuthHeaders(): Promise<{ [key: string]: string }> {
        const accessToken = await this.getAccessToken();

        if (!accessToken) {
            throw new BadRequestException('Unable to get valid Billz access token');
        }

        return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

}

export const billzAuth = BillzAuthService.getInstance();
