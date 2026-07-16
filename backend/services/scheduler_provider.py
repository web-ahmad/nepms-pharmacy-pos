from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import logging
import time
from sqlalchemy.orm import Session
from sqlalchemy.orm import Session
from models.reports import ReportExecutionHistory

logger = logging.getLogger(__name__)

class SchedulerProvider(ABC):
    @abstractmethod
    def schedule_report(self, report_name: str, schedule: Dict[str, Any], user_id: str, tenant_id: str, branch_id: Optional[str] = None) -> str:
        pass
        
    @abstractmethod
    def cancel_schedule(self, schedule_id: str) -> bool:
        pass
        
class APSchedulerProvider(SchedulerProvider):
    def __init__(self, scheduler):
        self.scheduler = scheduler

    def schedule_report(self, report_name: str, schedule: Dict[str, Any], user_id: str, tenant_id: str, branch_id: Optional[str] = None) -> str:
        logger.info(f"Scheduling {report_name} using APSchedulerProvider.")
        if not self.scheduler:
            logger.warning("APScheduler instance not provided. Returning fake schedule_id.")
            return f"sched_{report_name}"
            
        # Example logic for cron
        cron_expr = schedule.get("cron", "0 0 * * *")
        
        def job_func():
            logger.info(f"Executing scheduled report: {report_name}")
            start_time = time.time()
            status = 'success'
            error_msg = None
            try:
                from database import SessionLocal
                from services.reports_service import ReportsService
                from schemas.reports import DateRangeParams
                from datetime import date
                
                with SessionLocal() as db:
                    service = ReportsService(db)
                    params = DateRangeParams(start_date=date.today(), end_date=date.today(), branch_id=branch_id, export_format="pdf")
                    # Dynamically call the appropriate report based on report_name
                    # Fallback to summary for demonstration
                    service.get_sales_summary(tenant_id, params, "day")
            except Exception as e:
                logger.error(f"Error executing report {report_name}: {e}")
                status = 'failed'
                error_msg = str(e)
            finally:
                duration_ms = int((time.time() - start_time) * 1000)
                from database import SessionLocal
                with SessionLocal() as db:
                    # In a real scenario we'd use SchedulerService.record_execution
                    # but we can do it manually here or inject it
                    from models.reports import ReportExecutionHistory
                    history = ReportExecutionHistory(
                        tenant_id=tenant_id,
                        branch_id=branch_id,
                        user_id=user_id,
                        report_name=report_name,
                        schedule_id=f"sched_{report_name}_{user_id}",
                        status=status,
                        error_message=error_msg,
                        duration_ms=duration_ms,
                        export_format="pdf"
                    )
                    db.add(history)
                    db.commit()
            
        job = self.scheduler.add_job(
            job_func, 
            'cron', 
            minute=0, # Parse cron here ideally
            id=f"sched_{report_name}_{user_id}"
        )
        return job.id
        
    def cancel_schedule(self, schedule_id: str) -> bool:
        logger.info(f"Cancelling schedule {schedule_id} in APSchedulerProvider.")
        if self.scheduler:
            try:
                self.scheduler.remove_job(schedule_id)
                return True
            except Exception as e:
                logger.error(f"Failed to cancel schedule {schedule_id}: {e}")
                return False
        return True

class SchedulerService:
    """
    Abstraction layer for scheduling.
    Allows swapping out APScheduler with Celery or Redis later.
    """
    def __init__(self, provider: SchedulerProvider):
        self.provider = provider
        
    def schedule_report(self, report_name: str, schedule: Dict[str, Any], user_id: str, tenant_id: str, branch_id: Optional[str] = None) -> str:
        return self.provider.schedule_report(report_name, schedule, user_id, tenant_id, branch_id)
        
    def cancel_schedule(self, schedule_id: str) -> bool:
        return self.provider.cancel_schedule(schedule_id)
        
    def record_execution(self, db: Session, schedule_id: str, report_name: str, user_id: str, tenant_id: str, branch_id: Optional[str], status: str, error_message: str = None, duration_ms: int = 0, export_format: str = None):
        """Maintains execution history as per requirements."""
        history = ReportExecutionHistory(
            tenant_id=tenant_id,
            branch_id=branch_id,
            user_id=user_id,
            report_name=report_name,
            schedule_id=schedule_id,
            status=status,
            error_message=error_message,
            duration_ms=duration_ms,
            export_format=export_format
        )
        db.add(history)
        db.commit()
