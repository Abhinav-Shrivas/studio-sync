import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { instructorApi } from '../api/instructorApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Compass, Clock, Users, ArrowRight, Activity, Search } from 'lucide-react';

export function InstructorClassesPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('ALL');

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await instructorApi.getActiveClasses();
        setClasses(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Failed to load studio classes.');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const disciplines = ['ALL', ...new Set(classes.map((c) => c.discipline).filter(Boolean))];

  const filteredClasses = classes.filter((c) => {
    const matchesSearch =
      c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDiscipline =
      disciplineFilter === 'ALL' || c.discipline === disciplineFilter;
    return matchesSearch && matchesDiscipline;
  });

  if (loading) {
    return <LoadingSpinner message="Loading studio classes..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Active Classes Directory</h1>
          <p className="page-subtitle">
            Browse all active classes offered by the studio and explore your assigned teaching sessions.
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Search classes by title or description..."
            style={{ paddingLeft: '36px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="select-field"
          style={{ width: 'auto', minWidth: '180px' }}
          value={disciplineFilter}
          onChange={(e) => setDisciplineFilter(e.target.value)}
        >
          {disciplines.map((d) => (
            <option key={d} value={d}>
              {d === 'ALL' ? 'All Disciplines' : d}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px', color: 'var(--danger)' }}>
          {error}
        </div>
      ) : filteredClasses.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No classes found"
          description="Try adjusting your search terms or discipline filter."
        />
      ) : (
        <div className="grid-cols-3">
          {filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                transition: 'var(--transition)',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      color: '#818CF8',
                    }}
                  >
                    {cls.discipline}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    marginBottom: '8px',
                  }}
                >
                  {cls.title}
                </h3>

                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    lineHeight: '1.5',
                    marginBottom: '16px',
                  }}
                >
                  {cls.description || 'No description provided.'}
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} style={{ color: 'var(--text-muted)' }} />
                    <span>{cls.durationMinutes} mins</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={15} style={{ color: 'var(--text-muted)' }} />
                    <span>Cap: {cls.defaultCapacity}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/instructor/classes/${cls.id}/sessions`)}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>View My Sessions</span>
                <ArrowRight size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
