Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :public do
      get "event-types", to: "event_types#index"
      get "event-types/:event_type_id/slots", to: "event_types#slots"
      post "bookings", to: "bookings#create"
    end

    namespace :admin do
      post "sessions", to: "sessions#create"
      delete "sessions", to: "sessions#destroy"
      get "profile", to: "profiles#show"
      get "event-types", to: "event_types#index"
      post "event-types", to: "event_types#create"
      patch "event-types/:event_type_id", to: "event_types#update"
      delete "event-types/:event_type_id", to: "event_types#destroy"
      get "availability-rules", to: "availability_rules#index"
      put "availability-rules", to: "availability_rules#update"
      get "bookings/upcoming", to: "bookings#upcoming"
    end
  end

  root "frontend#index"
  get "*path", to: "frontend#index",
      constraints: ->(req) { !req.path.start_with?("/api/") && req.path != "/up" }
end
