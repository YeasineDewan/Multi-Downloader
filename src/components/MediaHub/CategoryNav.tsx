import React from 'react';
import { CategoryFilterBar, CategoryFilterBarProps } from './CategoryFilterBar';

export interface CategoryNavProps extends CategoryFilterBarProps {}

export const CategoryNav: React.FC<CategoryNavProps> = (props) => {
  return <CategoryFilterBar {...props} />;
};

export { CategoryFilterBar };
