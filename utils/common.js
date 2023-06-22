exports.pagingResult = (page, pageSize, data) => {
  return {
    data: data.slice((page - 1) * pageSize, page * pageSize),
    totalCount: data.length,
  };
};
