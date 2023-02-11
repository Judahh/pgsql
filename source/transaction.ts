import { IPool } from '@flexiblepersistence/dao';
import { ITransaction } from 'flexiblepersistence';

export class Transaction implements ITransaction {
  protected pool: IPool;

  constructor(pool: IPool) {
    this.pool = pool;
  }

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  public async begin(_options?): Promise<void> {
    await this.pool.query('BEGIN');
  }

  public async commit(): Promise<void> {
    await this.pool.query('COMMIT');
  }

  public async rollback(): Promise<void> {
    await this.pool.query('ROLLBACK');
  }
}
