class ApplicationController < ActionController::API
  rescue_from ApiError, with: :render_api_error
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActionController::ParameterMissing, with: :render_bad_request

  private

  def owner
    @owner ||= Owner.calendar
  end

  def render_api_error(error)
    render_error(error.status, error.code, error.message)
  end

  def render_not_found
    render_error(:not_found, "NOT_FOUND", "Ресурс не найден")
  end

  def render_bad_request(error)
    render_error(:bad_request, "BAD_REQUEST", "В запросе отсутствует обязательный параметр: #{error.param}")
  end

  def render_error(status, code, message)
    render json: { error: code, message: message }, status: status
  end
end
