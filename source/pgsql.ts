import { IPool } from '@flexiblepersistence/dao';
import { Pool } from 'pg';
import { PersistenceInfo, IEventOptions } from 'flexiblepersistence';

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
      let denseRank = !options?.noDenseRank
        ? 'DENSE_RANK() OVER(ORDER BY ' + idName + ') AS elementNumber,'
        : '';
      const distinct = !options?.noDistinct ? 'distinct ' : '';
      denseRank = idName
        ? 'SELECT ' + distinct + ' ' + denseRank + idName + ' FROM ('
        : '';
      const elementNumber = options?.useRowNumber
        ? 'ROW_NUMBER() OVER (ORDER BY ' + idName + ')'
        : 'COUNT(*)';

      const denseRankEnd = idName ? ' ) as pagingElement' : '';
      const query =
        'SELECT ' +
        elementNumber +
        ' FROM ( ' +
        denseRank +
        script +
        denseRankEnd +
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
      let denseRank = !options?.noDenseRank
        ? 'DENSE_RANK() OVER(ORDER BY ' + idName + ') AS elementNumber,'
        : '';
      const distinct = !options?.noDistinct ? 'distinct ' : '';
      denseRank = idName
        ? 'SELECT ' + distinct + ' ' + denseRank + idName + ' FROM ('
        : '';
      query =
        ` DECLARE @PageNumber AS INT, @RowsPage AS INT ` +
        `SET @PageNumber = ${options?.page} ` +
        `SET @RowsPage = ${options?.pageSize} ` +
        `SELECT * FROM (SELECT ${denseRank} * FROM ( `;
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
  public end(): Promise<any> {
    return this.pool.end();
  }
}
