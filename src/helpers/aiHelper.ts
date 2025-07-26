import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const collections = {
    distributionCenters: 'distribution_centers',
    users: 'users',
    products: 'products',
    orders: 'orders',
    orderItems: 'order_items',
    inventoryItems: 'inventory_items',
    conversations: 'conversations',
    messages: 'messages'
} as const;

interface ChatbotResponse {
    intent: string;
    needsEmail: boolean;
    botMessage: string;
    databaseQuery?: {
        collection: string;
        query: Record<string, any>;
        operation: 'find' | 'findOne' | 'aggregate' | 'count';
        projection?: Record<string, number>;
        sort?: Record<string, number>;
        limit?: number;
    };
    responseType: 'ask_email' | 'query_ready' | 'general_response';
}

// Step 1: Handle initial user query (determines if email is needed)
export async function handleInitialQuery(userPrompt: string) {
    return groq.chat.completions.create({
        model: "moonshotai/kimi-k2-instruct",
        messages: [
            { 
                role: "system", 
                content: `You are a marketplace chatbot. Analyze the user's request and determine if you need their email to help them.

Common requests that need email:
- "find my order" / "check my order" / "order status"
- "track my shipment" / "where is my package"
- "my purchase history" / "my orders"
- "cancel my order" / "return an item"
- "update my profile" / "my account"

Requests that DON'T need email:
- "show me products" / "find electronics"
- "what's the price of..." / "product details"
- "store locations" / "help"

If you need their email, ask for it politely. If not, you can help directly.` 
            },
            {
                role: "user",
                content: userPrompt,
            },
        ],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "initial_response",
                schema: {
                    type: "object",
                    properties: {
                        intent: { 
                            type: "string",
                            description: "What the user wants (e.g., 'find_order', 'check_status', 'browse_products')"
                        },
                        needsEmail: {
                            type: "boolean",
                            description: "Whether email is required for this request"
                        },
                        botMessage: {
                            type: "string", 
                            description: "Response message to the user"
                        },
                        responseType: {
                            type: "string",
                            enum: ["ask_email", "query_ready", "general_response"]
                        }
                    },
                    required: ["intent", "needsEmail", "botMessage", "responseType"],
                    additionalProperties: false
                }
            }
        }
    });
}

// Step 2: Handle email input and generate database query
export async function handleEmailAndGenerateQuery(originalUserQuery: string, emailInput: string, userId: number) {
    // Extract email from user input
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = emailInput.match(emailRegex);
    const email = emailMatch ? emailMatch[0] : emailInput.trim();

    return groq.chat.completions.create({
        model: "moonshotai/kimi-k2-instruct",
        messages: [
            { 
                role: "system", 
                content: `You are a marketplace chatbot. The user's original request was: "${originalUserQuery}"
Now they provided their email: "${email}"
User ID from database: ${userId}

Analyze the original request and generate the appropriate MongoDB query using user_id: ${userId}.

Available collections:
- users: {id, first_name, last_name, email, age, gender, state, city, country, created_at}
- orders: {order_id, user_id, status, gender, created_at, returned_at, shipped_at, delivered_at, num_of_item}
- order_items: {id, order_id, user_id, product_id, inventory_item_id, status, created_at, shipped_at, delivered_at, returned_at}
- inventory_items: {id, product_id, created_at, sold_at, cost, product_category, product_name, product_brand, product_retail_price, product_department, product_sku, product_distribution_center_id}
- products: {id, cost, category, name, brand, retail_price, department, sku, distribution_center_id}

Based on the original request, determine what the user wants and create the appropriate query:
- "find my order" / "check my orders" → query orders with user_id: ${userId}
- "order status" / "where is my order" → query orders with user_id: ${userId}  
- "my purchases" / "purchase history" → query orders with user_id: ${userId}
- "my order items" → query order_items with user_id: ${userId}
- etc.` 
            },
            {
                role: "user",
                content: `Original request: "${originalUserQuery}"\nEmail provided: "${email}"\nGenerate appropriate database query using user_id: ${userId}`,
            },
        ],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "query_response",
                schema: {
                    type: "object",
                    properties: {
                        intent: { type: "string" },
                        needsEmail: { 
                            type: "boolean",
                            const: false 
                        },
                        botMessage: {
                            type: "string",
                            description: "Message while processing (e.g., 'Let me look up your orders...')"
                        },
                        databaseQuery: {
                            type: "object",
                            properties: {
                                collection: { 
                                    type: "string",
                                    enum: ["users", "orders", "order_items", "products", "inventory_items", "distribution_centers"]
                                },
                                query: { type: "object" },
                                operation: {
                                    type: "string",
                                    enum: ["find", "findOne", "aggregate", "count"]
                                },
                                projection: { type: "object" },
                                sort: { type: "object" },
                                limit: { type: "number" }
                            },
                            required: ["collection", "query", "operation"]
                        },
                        responseType: {
                            type: "string",
                            const: "query_ready"
                        }
                    },
                    required: ["intent", "needsEmail", "botMessage", "databaseQuery", "responseType"],
                    additionalProperties: false
                }
            }
        }
    });
}

// Step 3: Format final response with query results
export async function formatFinalResponse(originalUserQuery: string, queryResults: any, userEmail: string) {
    return groq.chat.completions.create({
        model: "moonshotai/kimi-k2-instruct",
        messages: [
            { 
                role: "system", 
                content: `You are a marketplace chatbot. The user originally asked: "${originalUserQuery}"
Their email: "${userEmail}"

Format a friendly response based on the query results.

Examples:
- If orders found: "I found your orders! Order #12345 is currently 'shipped' and should arrive soon..."
- If no orders: "I don't see any orders associated with ${userEmail}. Would you like to browse our products?"
- If multiple orders: List them clearly with status and key details

Be conversational and helpful! Focus on what the user originally asked for.` 
            },
            {
                role: "user",
                content: `Original request: "${originalUserQuery}"\nQuery results: ${JSON.stringify(queryResults)}`,
            },
        ],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "final_response",
                schema: {
                    type: "object",
                    properties: {
                        botMessage: {
                            type: "string",
                            description: "Final formatted response to user"
                        },
                        hasResults: {
                            type: "boolean",
                            description: "Whether any relevant data was found"
                        },
                        resultCount: {
                            type: "number",
                            description: "Number of results found"
                        }
                    },
                    required: ["botMessage", "hasResults", "resultCount"],
                    additionalProperties: false
                }
            }
        }
    });
}

// Execute database query
export async function executeQuery(db: any, queryData: any) {
    const { collection, query, operation, projection, sort, limit } = queryData;
    const mongoCollection = db.collection(collection);
    
    switch (operation) {
        case 'find':
            let cursor = mongoCollection.find(query);
            if (projection) cursor = cursor.project(projection);
            if (sort) cursor = cursor.sort(sort);
            if (limit) cursor = cursor.limit(limit);
            return await cursor.toArray();
            
        case 'findOne':
            return await mongoCollection.findOne(query, { projection });
            
        case 'count':
            return await mongoCollection.countDocuments(query);
            
        default:
            throw new Error(`Unsupported operation: ${operation}`);
    }
}

// Main orchestration function
export async function processMarketplaceQuery(
    userMessage: string, 
    db: any,
    checkEmail: (email: string) => Promise<any>, // Your checkEmail function
    isEmailProvided: boolean = false,
    originalUserQuery?: string // Store the original query, not intent
) {
    try {
        if (!isEmailProvided) {
            // Step 1: Handle initial query
            const response = await handleInitialQuery(userMessage);
            const result = JSON.parse(response.choices[0]?.message.content!);
            
            return {
                botMessage: result.botMessage,
                needsEmail: result.needsEmail,
                intent: result.intent,
                originalQuery: userMessage, // Store the full original query
                step: 'initial'
            };
            
        } else {
            // Step 2: Extract email and get user
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
            const email = userMessage.match(emailRegex)?.[0] || userMessage.trim();
            
            // Use your checkEmail function to get user object
            const userObject = await checkEmail(email);
            
            if (!userObject || !userObject.id) {
                return {
                    botMessage: `I couldn't find an account with the email ${email}. Please check your email address or create an account.`,
                    needsEmail: false,
                    hasResults: false,
                    step: 'no_user_found'
                };
            }
            
            // Generate query using the original user query and user.id
            const queryResponse = await handleEmailAndGenerateQuery(originalUserQuery!, userMessage, userObject.id);
            const queryData = JSON.parse(queryResponse.choices[0]?.message.content!);
            
            // Execute the database query
            const queryResults = await executeQuery(db, queryData.databaseQuery);
            
            // Step 3: Format final response using original query
            const finalResponse = await formatFinalResponse(originalUserQuery!, queryResults, email);
            const finalResult = JSON.parse(finalResponse.choices[0]?.message.content!);
            
            return {
                botMessage: finalResult.botMessage,
                needsEmail: false,
                queryResults,
                hasResults: finalResult.hasResults,
                resultCount: finalResult.resultCount,
                userObject, // Include user object in response
                step: 'complete'
            };
        }
        
    } catch (error) {
        console.error('Error processing marketplace query:', error);
        return {
            botMessage: "Sorry, I encountered an error. Please try again.",
            needsEmail: false,
            step: 'error'
        };
    }
}