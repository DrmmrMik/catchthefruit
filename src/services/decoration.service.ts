import { DecorationCatalog, DecorationCatalogSchema, DecorationItem } from '../schema/decorations.schema';
import rawDecorations from '../../data/decorations.json';

export class DecorationService {
  private catalog: DecorationCatalog;

  constructor() {
    this.catalog = DecorationCatalogSchema.parse(rawDecorations);
  }

  public getCatalog(): DecorationCatalog {
    return this.catalog;
  }

  public getItemsByCategory(category: 'outside' | 'inside'): DecorationItem[] {
    return this.catalog.items.filter(item => item.category === category);
  }

  public getItemById(id: string): DecorationItem | undefined {
    return this.catalog.items.find(item => item.id === id);
  }
}

export const decorationService = new DecorationService();
