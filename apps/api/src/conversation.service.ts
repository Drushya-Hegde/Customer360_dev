import { Inject, Injectable } from '@nestjs/common';
import { Collection, MongoClient } from 'mongodb';

interface ConversationDocument {
  customerId: string;
  userId: string;
  messages: Array<{ role: 'user' | 'assistant'; text: string; createdAt: Date }>;
  updatedAt: Date;
}

@Injectable()
export class ConversationService {
  private readonly collectionName = 'customer_conversations';

  constructor(@Inject('MONGO_CLIENT') private readonly mongo: MongoClient) {}

  async append(customerId: string, userId: string, role: 'user' | 'assistant', text: string): Promise<void> {
    const collection: Collection<ConversationDocument> = this.mongo.db('customer360').collection<ConversationDocument>(this.collectionName);
    await collection.updateOne(
      { customerId, userId },
      { $push: { messages: { role, text, createdAt: new Date() } }, $set: { updatedAt: new Date() } },
      { upsert: true }
    );
  }
}