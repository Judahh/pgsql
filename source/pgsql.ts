import { IPool } from '@flexiblepersistence/dao';
import { Pool } from 'pg';
import { PersistenceInfo } from 'flexiblepersistence';

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
  validateOptions(options?: {
    page?: number | undefined;
    pageSize?: number | undefined;
    numberOfPages?: number | undefined;
  }): boolean {
    if (options?.pageSize) {
      options.page = options.page || 1;
      return !isNaN(options.page) && !isNaN(options.pageSize);
    }
    return false;
  }
  async getNumberOfPages(
    script: string,
    options?: {
      page?: number | undefined;
      pageSize?: number | undefined;
      numberOfPages?: number | undefined;
    },
    // eslint-disable-next-line no-unused-vars
    reject?: (error: Error) => unknown
  ): Promise<void> {
    if (this.validateOptions(options)) {
      const query = 'SELECT COUNT(*) FROM ( ' + script + ' ) as numberOfPages';
      await this.pool.query(query, (error, results) => {
        if (error && reject) {
          reject(new Error(error));
        } else if (options) {
          options.numberOfPages = results.rows[0];
        }
      });
    }
  }
  async generatePaginationPrefix(options?: {
    page?: number | undefined;
    pageSize?: number | undefined;
    numberOfPages?: number | undefined;
  }): Promise<unknown> {
    let query = '';
    if (this.validateOptions(options)) {
      query =
        ` DECLARE @PageNumber AS INT, @RowsPage AS INT ` +
        `SET @PageNumber = ${options?.page} ` +
        `SET @RowsPage = ${options?.pageSize} ` +
        `SELECT * FROM (SELECT DENSE_RANK() OVER(ORDER BY pagingElement.id) AS elementNumber,* FROM ( `;
    }
    return query;
  }
  async generatePaginationSuffix(options?: {
    page?: number | undefined;
    pageSize?: number | undefined;
    numberOfPages?: number | undefined;
  }): Promise<unknown> {
    let query = '';
    if (this.validateOptions(options)) {
      query =
        `) as pagingElement) as newPagingElement WHERE ` +
        `elementNumber BETWEEN((@PageNumber - 1) * @RowsPage + 1) ` +
        `AND (@PageNumber * @RowsPage) `;
    }
    return query;
  }
  public getPersistenceInfo(): PersistenceInfo {
    return this.persistenceInfo;
  }
  public connect(callback: unknown): Promise<unknown> {
    return this.pool.connect(callback);
  }
  public query(
    script: string,
    values?: Array<unknown>,
    callback?: () => unknown
  ): Promise<unknown> {
    // console.log('SCRIPT:', script, values, callback);
    return this.pool.query(script, values, callback);
  }
  public end(callback?: () => unknown): Promise<any> {
    return this.pool.end(callback);
  }
}
