import React from 'react';
import { Navigate } from 'react-router-dom';

/** Редирект: раздел объединён с «Курсы» */
export const ModeratorCourseReviewsPage: React.FC = () => <Navigate to="/courses" replace />;
