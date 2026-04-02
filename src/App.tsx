import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './app/components/Layout';
import { AuthProvider } from './context/AuthContext';
import { NewsPage } from './pages/NewsPage';
import { NewsPublicationPage } from './pages/NewsPublicationPage';
import { DirectionsPage } from './pages/DirectionsPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { TopicsPage } from './pages/TopicsPage';
import { PublicationsListPage } from './pages/PublicationsListPage';
import { PublicationDetailPage } from './pages/PublicationDetailPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import {AllProjectsPage} from "./pages/Allprojectspage";
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminPage } from './pages/AdminPage';
import { ImportExportPage } from './pages/ImportExportPage';

export default function App() {
  return (
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="news" element={<NewsPage />} />
              <Route path="news/:id" element={<NewsPublicationPage />} />
              <Route path="directions" element={<DirectionsPage />} />
              <Route path="directions/:dirId/subjects" element={<SubjectsPage />} />
              <Route path="subjects/:subjectId/topics" element={<TopicsPage />} />
              <Route path="topics/:topicId/publications" element={<PublicationsListPage />} />
              <Route path="publications/:id" element={<PublicationDetailPage />} />
              {/* Обычные пользователи — свои проекты */}
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              {/* Модератор — проекты школьников своих школ */}
              <Route path="moderator/projects" element={<AllProjectsPage />} />
              {/* Администратор — все проекты */}
              <Route path="admin/projects" element={<AllProjectsPage />} />
              <Route path="profile/:nickname" element={<ProfilePage />} />
              <Route path="profile/edit" element={<EditProfilePage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/news" replace />} />

              <Route path="/admin/import-export" element={<ImportExportPage />} />

            </Route>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
  );
}