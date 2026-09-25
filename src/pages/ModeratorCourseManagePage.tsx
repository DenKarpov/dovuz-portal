import React from 'react';
import { Navigate } from 'react-router-dom';

/** Редирект: управление курсом — внутри страницы курса (вкладка модератора) */
export const ModeratorCourseManagePage: React.FC = () => <Navigate to="/courses" replace />;
