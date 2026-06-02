/** Matches Volo.Abp.Application.Dtos.PagedResultDto<T> from the API. */
export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
}
