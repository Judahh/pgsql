import { IPool } from '@flexiblepersistence/dao';
import { Pool } from 'pg';
import { PersistenceInfo, IEventOptions } from 'flexiblepersistence';
import { Transaction } from './transaction';

export class PGSQL implements IPool {
  protected pool: Pool;
  simpleCreate = false;
  simpleUpdate = false;
  simpleDelete = false;
  protected persistenceInfo: PersistenceInfo;
  constructor(persistenceInfo: PersistenceInfo) {
    this.persistenceInfo = persistenceInfo;
    this.pool = new Pool(this.persistenceInfo);
  }
  validateOptions(options?: IEventOptions): boolean {
    if (options) {
      options.pageSize = options?.pageSize || options?.pagesize;
      if (options?.pageSize !== undefined && options?.pageSize !== null) {
        options.page =
          options?.page !== undefined && options?.page !== null
            ? parseInt(options?.page?.toString())
            : 1;
        options.pageSize = parseInt(options?.pageSize?.toString());
        return (
          !isNaN(options?.page) &&
          !isNaN(options?.pageSize as unknown as number)
        );
      }
    }
    return false;
  }
  async getPages(
    script: string,
    values?: Array<unknown>,
    options?: IEventOptions,
    idName?: string
  ): Promise<number> {
    if (options && this.validateOptions(options)) {
      let elementNumber =
        (!options?.noDenseRank && idName !== undefined
          ? 'DENSE_RANK() OVER(ORDER BY ' + idName + ')'
          : options?.useRowNumber && idName !== undefined
          ? 'ROW_NUMBER() OVER (ORDER BY ' + idName + ')'
          : 'COUNT(*)') + ' AS elementNumber';
      const distinct = !options?.noDistinct ? 'distinct ' : '';
      const addParam = idName ? ',' + idName : '';
      elementNumber = 'SELECT ' + distinct + ' ' + elementNumber + addParam;
      const query =
        'SELECT COUNT(*) FROM ( ' +
        elementNumber +
        ' FROM (' +
        script +
        ' ) as pagingElement' +
        ' ) as pages';
      const results = await this.pool.query(query, values);
      if (options?.pageSize && results?.rows && results?.rows[0]) {
        const rows = results.rows[0][''];
        options.pages = Math.ceil(
          rows / parseInt(options?.pageSize?.toString())
        );
      }
    }
    return parseInt((options?.pages || 1).toString());
  }
  async generatePaginationPrefix(
    options?: IEventOptions,
    idName?: string
  ): Promise<string> {
    let query = '';
    if (this.validateOptions(options)) {
      let elementNumber =
        (!options?.noDenseRank && idName !== undefined
          ? 'DENSE_RANK() OVER(ORDER BY ' + idName + ')'
          : options?.useRowNumber && idName !== undefined
          ? 'ROW_NUMBER() OVER (ORDER BY ' + idName + ')'
          : 'COUNT(*)') + ' AS elementNumber';
      const distinct = !options?.noDistinct ? 'distinct ' : '';
      const addParam = ',*';
      elementNumber = 'SELECT ' + distinct + ' ' + elementNumber + addParam;
      query =
        ` DECLARE @PageNumber AS INT, @RowsPage AS INT ` +
        `SET @PageNumber = ${options?.page} ` +
        `SET @RowsPage = ${options?.pageSize} ` +
        `SELECT * FROM (${elementNumber} FROM ( `;
    }
    return query;
  }
  async generatePaginationSuffix(options?: IEventOptions): Promise<string> {
    let query = '';
    if (this.validateOptions(options)) {
      query =
        `) as pagingElement) as newPagingElement WHERE ` +
        `elementNumber BETWEEN(@PageNumber * @RowsPage + 1) ` +
        `AND ((@PageNumber + 1) * @RowsPage) `;
    }
    return query;
  }
  async groupByPagination(
    options?: IEventOptions,
    idName?: string,
    internalQuery?: string,
    groupBy?: string
  ): Promise<string> {
    return groupBy || '';
  }
  public getPersistenceInfo(): PersistenceInfo {
    return this.persistenceInfo;
  }
  public connect(): Promise<boolean> {
    return this.pool.connect();
  }
  public query(
    script: string,
    values?: Array<unknown>
  ): Promise<{
    rows?: Array<unknown>;
    rowCount?: number;
    rowsAffected?: number[];
    recordset?: any;
  }> {
    // console.log('SCRIPT:', script, values, callback);
    return this.pool.query(script, values);
  }
  public async begin(options?): Promise<Transaction> {
    const t = new Transaction(this.pool);
    await t.begin(options);
    return t;
  }
  public async commit(transaction: Transaction): Promise<void> {
    await transaction.commit();
  }
  public async rollback(transaction: Transaction): Promise<void> {
    await transaction.rollback();
  }
  public end(): Promise<any> {
    return this.pool.end();
  }
}
